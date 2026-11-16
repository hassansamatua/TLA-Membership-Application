// AzamPay Payment Gateway Integration
// Based on official AzamPay API documentation
import { createVerify } from 'node:crypto';
const AZAMPAY_CONFIG = {
  sandbox: {
    authenticatorBaseUrl: 'https://authenticator-sandbox.azampay.co.tz',
    checkoutBaseUrl: 'https://sandbox.azampay.co.tz',
  },
  production: {
    authenticatorBaseUrl: 'https://authenticator.azampay.co.tz',
    checkoutBaseUrl: 'https://api.azampay.co.tz',
  }
};

// Configuration - using hardcoded test values for demo
const AZAMPAY_CREDENTIALS = {
  clientId: process.env.AZAMPAY_CLIENT_ID || '',
  clientSecret: process.env.AZAMPAY_CLIENT_SECRET || '',
  appName: process.env.AZAMPAY_APP_NAME || '',
  apiKey: process.env.AZAMPAY_API_KEY || '',
  callbackUrl: process.env.AZAMPAY_CALLBACK_URL || '',
  environment: process.env.AZAMPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  testMode: process.env.AZAMPAY_TEST_MODE === 'true'
};

interface AzamPayAuthResponse {
  data: {
    accessToken: string;
    expiresIn: number;
  };
  success: boolean;
  message: string;
}

interface AzamPayCheckoutRequest {
  accountNumber: string;
  amount: string;
  currency: string;
  provider: string;
  externalId: string;
  additionalProperties?: Record<string, unknown>;
}

interface AzamPayCheckoutResponse {
  data?: {
    checkoutUrl?: string;
    reference?: string;
    transactionId?: string;
    pgReferenceId?: string;
    referenceId?: string;
    [key: string]: unknown;
  } | string;
  success: boolean;
  message: string;
  checkoutUrl?: string;
  reference?: string;
  transactionId?: string;
  pgReferenceId?: string;
  referenceId?: string;
}

interface AzamPayPaymentStatus {
  data: {
    reference: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    amount: string;
    currency: string;
    transactionId?: string;
    paymentMethod?: string;
    timestamp: string;
  };
  success: boolean;
  message: string;
}

class AzamPayService {
  private config: typeof AZAMPAY_CONFIG.sandbox | typeof AZAMPAY_CONFIG.production;
  private credentials: typeof AZAMPAY_CREDENTIALS;

  constructor() {
    this.config = AZAMPAY_CONFIG[AZAMPAY_CREDENTIALS.environment as keyof typeof AZAMPAY_CONFIG];
    this.credentials = AZAMPAY_CREDENTIALS;
  }

  private requireCredentials() {
    if (!this.credentials.testMode && (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.appName || !this.credentials.apiKey || !this.credentials.callbackUrl)) {
      throw new Error('Payment gateway is not configured');
    }
  }

  /**
   * Get authentication token from AzamPay
   */
  async getAuthToken(): Promise<string> {
    // Test mode - return fake token
    if (this.credentials.testMode) {
      return 'test-mode-token';
    }

    this.requireCredentials();
    try {
      
      const response = await fetch(`${this.config.authenticatorBaseUrl}/AppRegistration/GenerateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: this.credentials.clientId,
          clientSecret: this.credentials.clientSecret,
          appName: this.credentials.appName,
          apiKey: this.credentials.apiKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 423 || response.statusText === 'Locked') {
          throw new Error('AzamPay app is locked. Please complete app registration with valid callback URL in AzamPay dashboard.');
        }
        
        throw new Error(`AzamPay auth failed: ${response.statusText} - ${errorText}`);
      }

      const data: AzamPayAuthResponse = await response.json();
      
      if (!data.success || !data.data?.accessToken) {
        throw new Error(`AzamPay auth failed: ${data.message}`);
      }
      
      return data.data.accessToken;
    } catch (error) {
      console.error('AzamPay authentication error:', error);
      throw error;
    }
  }

  /**
   * Create checkout payment
   */
  async createCheckout(paymentData: AzamPayCheckoutRequest): Promise<AzamPayCheckoutResponse> {
    // Test mode - return fake checkout response
    if (this.credentials.testMode) {
      console.log('AzamPay Test Mode: Creating fake checkout');
      const fakeReference = 'TEST-' + Date.now();
      const fakeCheckoutUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/payment/success?reference=${fakeReference}&test=true`;
      
      return {
        data: {
          checkoutUrl: fakeCheckoutUrl,
          reference: fakeReference,
          transactionId: 'TEST-TXN-' + Date.now(),
        },
        success: true,
        message: 'Test checkout created successfully'
      };
    }

    try {
      this.requireCredentials();

      // AzamPay sandbox auth is intermittently flaky — retry once with a fresh token on 401/403.
      let response: Response | null = null;
      for (let attempt = 0; attempt < 2 && !response?.ok; attempt++) {
        const token = await this.getAuthToken();
        response = await fetch(`${this.config.checkoutBaseUrl}/azampay/mno/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-API-KEY': this.credentials.apiKey,
          },
          body: JSON.stringify(paymentData),
          signal: AbortSignal.timeout(45_000),
        });
        if (![401, 403].includes(response.status)) break;
      }

      if (!response!.ok) {
        const errorText = await response.text();
        
        if (response.status === 423 || response.statusText === 'Locked') {
          throw new Error('AzamPay app is locked. Please complete app registration with valid callback URL in AzamPay dashboard.');
        }
        
        throw new Error(`AzamPay checkout failed: ${response.statusText} - ${errorText}`);
      }

      const data: AzamPayCheckoutResponse = await response.json();
      
      if (!data.success) {
        throw new Error(`AzamPay checkout failed: ${data.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ AzamPay checkout error:', error);
      throw error;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(reference: string): Promise<AzamPayPaymentStatus> {
    // Test mode - return fake successful payment
    if (this.credentials.testMode || reference.startsWith('TEST-')) {
      throw new Error('Unverified test payments cannot activate membership');
    }

    this.requireCredentials();
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.config.checkoutBaseUrl}/Checkout/GetTransactionStatus?reference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-KEY': this.credentials.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AzamPay status check failed: ${response.statusText}`);
      }

      const data: AzamPayPaymentStatus = await response.json();
      
      if (!data.success) {
        throw new Error(`AzamPay status check failed: ${data.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('AzamPay status check error:', error);
      throw error;
    }
  }

  /**
   * Create membership payment checkout
   */
  async createMembershipPayment({
    userId,
    membershipType,
    amount,
    userEmail,
    userPhone,
    orderId,
    paymentMethod,
  }: {
    userId: string;
    membershipType: string;
    amount: number;
    userEmail: string;
    userPhone: string;
    orderId: string;
    paymentMethod?: string;
  }): Promise<AzamPayCheckoutResponse> {
    const providerConfig = this.getProviderConfig(paymentMethod || 'azampesa');
    if (providerConfig.code === 'UNKNOWN') throw new Error('Unsupported payment method');
    const checkoutData: AzamPayCheckoutRequest = {
      accountNumber: userPhone,
      amount: amount.toString(),
      currency: 'TZS',
      provider: providerConfig.code,
      externalId: orderId,
      additionalProperties: {
        callbackUrl: this.credentials.callbackUrl,
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/payment/success?reference=${encodeURIComponent(orderId)}`,
        vendorId: userId,
        membershipType,
        customerEmail: userEmail,
      },
    };

    return this.createCheckout(checkoutData);
  }

  /**
   * Get provider configuration for mobile money integration
   */
  private getProviderConfig(provider: string) {
    const providers = {
      azampesa: {
        name: 'AzamPesa',
        code: 'Azampesa',
        ussd: '*150*01#',
        color: '#0052CC'
      },
      mpesa: {
        name: 'M-Pesa',
        code: 'Mpesa',
        ussd: '*150*01#',
        color: '#35B039'
      },
      halopesa: {
        name: 'HaloPesa',
        code: 'Halopesa',
        ussd: '*150*02#',
        color: '#8B3A9C'
      },
      airtelmoney: {
        name: 'Airtel Money',
        code: 'Airtel',
        ussd: '*150*03#',
        color: '#ED1C24'
      },
      tigopesa: {
        name: 'Tigo Pesa',
        code: 'Tigo',
        ussd: '*150*04#',
        color: '#00A6CE'
      },
      mixxbyyas: {
        name: 'Mixx By Yas',
        code: 'Tigo',
        ussd: '*150*04#',
        color: '#00A6CE'
      }
    };

    return providers[provider as keyof typeof providers] || {
      name: 'Unknown',
      code: 'UNKNOWN',
      ussd: '*150#',
      color: '#6B7280'
    };
  }

  /**
   * Get provider USSD code for user reference
   */
  getProviderUSSD(provider: string): string {
    const config = this.getProviderConfig(provider);
    return config.ussd;
  }

  /**
   * Get provider display name
   */
  getProviderName(provider: string): string {
    const config = this.getProviderConfig(provider);
    return config.name;
  }

  /**
   * Verify webhook signature (for security)
   */
  async verifyWebhookPayload(payload: Record<string, unknown>): Promise<boolean> {
    try {
      this.requireCredentials();
      const signature = String(payload.signature || '');
      if (!signature) return false;
      const signedPayload = [
        payload.utilityref,
        payload.externalreference,
        payload.transactionstatus,
        payload.operator,
      ].map(value => String(value ?? '')).join('');
      if (!signedPayload) return false;

      const keyResponse = await fetch(`${this.config.checkoutBaseUrl}/azampay/v1/public-key?format=Pem`, {
        headers: { 'X-API-KEY': this.credentials.apiKey },
      });
      if (!keyResponse.ok) return false;
      const keyBody: unknown = await keyResponse.json().catch(() => null);
      const publicKey = typeof keyBody === 'object' && keyBody
        ? String((keyBody as Record<string, unknown>).data || (keyBody as Record<string, unknown>).key || '')
        : String(keyBody || '');
      if (!publicKey.includes('BEGIN PUBLIC KEY')) return false;

      return createVerify('RSA-SHA256')
        .update(signedPayload)
        .end()
        .verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }
}

export const azampayService = new AzamPayService();
export type {
  AzamPayAuthResponse,
  AzamPayCheckoutRequest,
  AzamPayCheckoutResponse,
  AzamPayPaymentStatus,
};
