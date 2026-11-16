import type { GatewayInitiation, GatewayInitiationResult, GatewayVerification, PaymentGateway } from './types.ts';

const gateways = new Map<string, PaymentGateway>();
const registered = new Set<string>();

export function registerGateway(gateway: PaymentGateway) {
  if (gateway.providerCode === 'test-gateway') {
    if (process.env.NODE_ENV === 'production') throw new Error('Test payment gateway is forbidden in production');
    if (process.env.PHASE1A_TEST_DB !== '1') throw new Error('Test payment gateway requires disposable database authorization');
  }
  if (registered.has(gateway.providerCode)) throw new Error('Payment gateway is already registered');
  gateways.set(gateway.providerCode, gateway);
  registered.add(gateway.providerCode);
}

export function getGateway(providerCode: string): PaymentGateway {
  const gateway = gateways.get(providerCode);
  if (!gateway) throw new Error('Unknown payment provider');
  return gateway;
}

export class AzamPayAdapter implements PaymentGateway {
  providerCode = 'azampay';
  async initiatePayment(): Promise<GatewayInitiation> {
    throw new Error('BLOCKED: official AzamPay checkout documentation and sandbox credentials are required');
  }
  async verifyNotification(): Promise<{ providerReference: string; providerEventId?: string }> {
    throw new Error('BLOCKED: official AzamPay callback verification specification is required');
  }
  async checkTransactionStatus(): Promise<GatewayVerification> {
    throw new Error('BLOCKED: official AzamPay transaction-status specification is required');
  }
}

export class TestPaymentGateway implements PaymentGateway {
  providerCode = 'test-gateway';
  responses = new Map<string, GatewayVerification>();
  refundConfirmed = true;
  initiationFails = false;
  initiationOutcome: 'accept' | 'definite-reject' | 'timeout-before-accept' | 'timeout-after-accept' = 'accept';
  initiationCalls = 0;
  initiatedSessions = new Set<string>();
  verificationDelayMs = 0;
  refundInitiations = 0;
  refundReferences = new Set<string>();

  async initiatePayment(input: { paymentReference: string }): Promise<GatewayInitiation> {
    this.initiationCalls++;
    const mode=this.initiationFails?'definite-reject':this.initiationOutcome;
    if(mode==='definite-reject')throw Object.assign(new Error('Synthetic gateway initiation failure'),{definiteRejection:true});
    if(mode==='timeout-after-accept')this.initiatedSessions.add(input.paymentReference);
    if(mode.startsWith('timeout'))throw new Error('Synthetic gateway initiation timeout');
    this.initiatedSessions.add(input.paymentReference);
    return { providerReference: input.paymentReference, checkoutUrl: `test://checkout/${input.paymentReference}` };
  }

  async checkInitiation(paymentReference:string):Promise<GatewayInitiationResult>{
    if(this.initiatedSessions.has(paymentReference))return{outcome:'PROVIDER_ACCEPTED',initiation:{providerReference:paymentReference,checkoutUrl:`test://checkout/${paymentReference}`}};
    if(this.initiationOutcome==='definite-reject'||this.initiationFails)return{outcome:'DEFINITE_REJECTION',reason:'Synthetic provider rejected initiation'};
    return{outcome:'OUTCOME_UNKNOWN',reason:'Synthetic provider has no accepted session'};
  }

  async verifyNotification(input: { headers: Record<string,string>; rawBody: string }) {
    const body = JSON.parse(input.rawBody) as { reference?: string; eventId?: string };
    if (!body.reference) throw new Error('Invalid notification');
    return { providerReference: body.reference, providerEventId: body.eventId };
  }

  async checkTransactionStatus(providerReference: string): Promise<GatewayVerification> {
    if(this.verificationDelayMs>0)await new Promise(r=>setTimeout(r,this.verificationDelayMs));
    const response = this.responses.get(providerReference);
    if (!response) throw new Error('Gateway verification unavailable');
    return response;
  }

  async initiateRefund(input: { providerReference: string }) {
    this.refundInitiations++;
    const providerRefundReference = `refund-${input.providerReference}-${this.refundInitiations}`;
    this.refundReferences.add(providerRefundReference);
    return { providerRefundReference };
  }

  async verifyRefund(input: { providerReference: string; providerRefundReference?: string }) {
    return this.refundConfirmed && !!input.providerRefundReference && this.refundReferences.has(input.providerRefundReference);
  }
}

registerGateway(new AzamPayAdapter());
