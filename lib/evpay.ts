// EvPay Payment Gateway Integration
// Based on https://docs.evpay.co.tz — mobile money collection (USSD push)
// Auth: OAuth-style bearer token + HMAC-SHA256 request signatures.
// Webhooks: X-EvPay-Signature "t=<ms>,v1=<hmac>" over "{t}.{raw_body}" keyed by client_secret.
import { createHmac, timingSafeEqual } from 'node:crypto';

const EVPAY_CREDENTIALS = {
  clientId: process.env.EVPAY_CLIENT_ID || '',
  clientSecret: process.env.EVPAY_CLIENT_SECRET || '',
  callbackUrl: process.env.EVPAY_CALLBACK_URL || '',
  baseUrl: (process.env.EVPAY_BASE_URL || 'https://api.evpay.co').replace(/\/$/, ''),
  tokenUrl: process.env.EVPAY_TOKEN_URL || '',
  environment: process.env.EVPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
};

// EvPay operators — only the four documented values are valid.
const FS_OPERATORS: Record<string, string> = {
  mpesa: 'Mpesa',
  vodacom: 'Mpesa',
  halopesa: 'HaloPesa',
  airtelmoney: 'AirtelMoney',
  airtel: 'AirtelMoney',
  tigopesa: 'TigoPesa',
  tigo: 'TigoPesa',
  mixxbyyas: 'TigoPesa',
};

interface EvPayTokenCache {
  token: string;
  expiresAt: number;
}

interface EvPayCreateResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    requestId?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EvPayUssdRequest {
  fsOperator: string;
  amount: number;
  product: string;
  callbackUrl: string;
  payerAccountId: string;
  requestId: string;
  currency?: string;
  payerName?: string;
  narrative?: string;
}

class EvPayService {
  private credentials = EVPAY_CREDENTIALS;
  private tokenCache: EvPayTokenCache | null = null;

  private requireCredentials() {
    if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.callbackUrl) {
      throw new Error('EvPay gateway is not configured');
    }
  }

  mapOperator(paymentMethod: string): string {
    const op = FS_OPERATORS[String(paymentMethod || '').toLowerCase()];
    if (!op) throw new Error(`Unsupported EvPay operator: ${paymentMethod}`);
    return op;
  }

  private sign(body: string): { timestamp: string; signature: string } {
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', this.credentials.clientSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    return { timestamp, signature };
  }

  async getAccessToken(): Promise<string> {
    this.requireCredentials();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }
    const tokenUrl = this.credentials.tokenUrl || `${this.credentials.baseUrl}/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`EvPay auth failed: ${response.status} ${response.statusText} - ${text}`);
    }
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    const token = String(data?.access_token || (data?.data as Record<string, unknown> | undefined)?.access_token || '');
    if (!token) throw new Error('EvPay auth failed: no access token in response');
    const expiresIn = Number(data?.expires_in) || 900;
    this.tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  }

  private async signedFetch(path: string, method: 'GET' | 'POST', body?: string) {
    const token = await this.getAccessToken();
    const { timestamp, signature } = this.sign(body || '');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${this.credentials.baseUrl}${path}`, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(45_000),
    });
  }

  async createUssdPayment(request: Omit<EvPayUssdRequest, 'fsOperator'> & { paymentMethod: string }): Promise<EvPayCreateResponse> {
    this.requireCredentials();
    const payload: EvPayUssdRequest = {
      fsOperator: this.mapOperator(request.paymentMethod),
      amount: Math.round(request.amount),
      product: request.product.slice(0, 128),
      callbackUrl: this.credentials.callbackUrl,
      currency: request.currency || 'TZS',
      payerAccountId: request.payerAccountId,
      requestId: request.requestId,
      ...(request.payerName ? { payerName: request.payerName.slice(0, 128) } : {}),
      ...(request.narrative ? { narrative: request.narrative.slice(0, 256) } : {}),
    };
    const response = await this.signedFetch('/api/v1/payment/ussd', 'POST', JSON.stringify(payload));
    const data: EvPayCreateResponse = await response.json().catch(() => ({ success: false, code: response.status, message: '' }));
    if (!response.ok || data.success === false) {
      throw new Error(`EvPay checkout failed: ${data.message || `${response.status} ${response.statusText}`}`);
    }
    return data;
  }

  async getPaymentStatus(id: string) {
    this.requireCredentials();
    const response = await this.signedFetch(`/api/v1/payment/${encodeURIComponent(id)}`, 'GET');
    if (!response.ok) {
      throw new Error(`EvPay status check failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Verify an EvPay webhook. Header: X-EvPay-Signature: t=<ms>,v1=<hex-hmac>
   * Signed string: "{t}.{rawBody}" HMAC-SHA256 keyed by client_secret.
   * Rejects missing headers, bad signatures, and timestamps older than 5 minutes.
   */
  verifyWebhookSignature(signatureHeader: string | null, rawBody: string): boolean {
    try {
      this.requireCredentials();
      if (!signatureHeader) return false;
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(kv => {
          const idx = kv.indexOf('=');
          return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
        })
      );
      const t = parts.t;
      const v1 = parts.v1;
      if (!t || !v1) return false;
      const sentAt = Number(t);
      if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 5 * 60 * 1000) return false;
      const expected = createHmac('sha256', this.credentials.clientSecret)
        .update(`${t}.${rawBody}`)
        .digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(v1, 'utf8');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

export const evpayService = new EvPayService();
export type { EvPayCreateResponse };
