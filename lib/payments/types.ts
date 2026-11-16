export type PaymentState = 'PENDING' | 'PROCESSING' | 'VERIFICATION_REQUIRED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'RECONCILIATION_REQUIRED';
export type PaymentKind = 'SEPARATE' | 'COMBINED';
export type RefundState = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'FAILED';

export interface CycleQuote {
  cycleYear: number;
  baseAmount: number;
  penaltyAmount: number;
  totalDue: number;
  isPaid?: boolean;
}

export interface GatewayInitiation {
  providerReference: string;
  checkoutUrl?: string;
  expiresAt?: Date;
}

export interface GatewayInitiationResult {
  outcome: 'PROVIDER_ACCEPTED' | 'DEFINITE_REJECTION' | 'OUTCOME_UNKNOWN';
  initiation?: GatewayInitiation;
  reason?: string;
}

export interface GatewayVerification {
  providerReference: string;
  providerTransactionId?: string;
  state: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  amount: number;
  currency: string;
  memberReference?: string;
}

export interface PaymentGateway {
  providerCode: string;
  initiatePayment(input: { paymentReference: string; amount: number; currency: string; memberId: number; metadata?: unknown }): Promise<GatewayInitiation>;
  checkInitiation?(paymentReference: string): Promise<GatewayInitiationResult>;
  verifyNotification?(input: { headers: Record<string,string>; rawBody: string }): Promise<{ providerReference: string; providerEventId?: string }>;
  checkTransactionStatus(providerReference: string): Promise<GatewayVerification>;
  initiateRefund?(input: { providerReference: string; amount: number; reason: string }): Promise<{ providerRefundReference?: string }>;
  verifyRefund?(input: { providerReference: string; providerRefundReference?: string }): Promise<boolean>;
}
