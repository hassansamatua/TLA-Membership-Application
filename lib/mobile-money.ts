// Direct Mobile Money Integration
// This handles direct integration with mobile money providers

export interface MobileMoneyRequest {
  provider: 'azampesa' | 'mpesa' | 'halopesa' | 'airtelmoney' | 'tigopesa';
  phoneNumber: string;
  amount: number;
  reference: string;
  customerName: string;
}

export interface MobileMoneyResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  provider: string;
  status: 'initiated' | 'completed' | 'failed';
}

class MobileMoneyService {
  private providerConfigs = {
    azampesa: {
      name: 'AzamPesa',
      ussdCode: '*150*01#',
      apiEndpoint: 'https://api.azampesa.co.tz/v1/payments',
      merchantCode: process.env.AZAMPAY_MERCHANT_CODE || '',
    },
    mpesa: {
      name: 'M-Pesa',
      ussdCode: '*150*01#',
      apiEndpoint: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || '',
      passkey: process.env.MPESA_PASSKEY || '',
    },
    halopesa: {
      name: 'HaloPesa',
      ussdCode: '*150*02#',
      apiEndpoint: 'https://api.halopesa.co.tz/v1/transactions',
      merchantId: process.env.HALOPESA_MERCHANT_ID || '',
    },
    airtelmoney: {
      name: 'Airtel Money',
      ussdCode: '*150*03#',
      apiEndpoint: 'https://api.airtelmoney.co.tz/v1/payments',
      merchantId: process.env.AIRTEL_MERCHANT_ID || '',
    },
    tigopesa: {
      name: 'Tigo Pesa',
      ussdCode: '*150*04#',
      apiEndpoint: 'https://api.tigopesa.co.tz/v1/payments',
      merchantCode: process.env.TIGOPESA_MERCHANT_CODE || '',
    }
  };

  /**
   * Initiate direct mobile money payment
   */
  async initiatePayment(request: MobileMoneyRequest): Promise<MobileMoneyResponse> {
    const config = this.providerConfigs[request.provider];
    
    try {
      console.log(`Initiating ${config.name} payment for ${request.phoneNumber}`);
      
      // In production, this would call the actual provider APIs
      // For now, we'll simulate the direct integration
      
      const response = await this.simulateProviderPayment(request, config);
      
      return response;
      
    } catch (error) {
      console.error(`${config.name} payment error:`, error);
      return {
        success: false,
        message: `Failed to initiate ${config.name} payment`,
        provider: request.provider,
        status: 'failed'
      };
    }
  }

  /**
   * Simulate provider payment (in production, replace with actual API calls)
   */
  private async simulateProviderPayment(request: MobileMoneyRequest, config: any): Promise<MobileMoneyResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate transaction ID
    const transactionId = `${request.provider.toUpperCase()}-${Date.now()}`;
    
    // In production, this would trigger actual USSD or app integration
    console.log(`${config.name} Payment Initiated:`);
    console.log(`- Phone: ${request.phoneNumber}`);
    console.log(`- Amount: TZS ${request.amount.toLocaleString()}`);
    console.log(`- Reference: ${request.reference}`);
    console.log(`- Transaction ID: ${transactionId}`);
    
    // For demo purposes, we'll simulate success
    // In production, this would depend on actual provider response
    return {
      success: true,
      transactionId,
      message: `${config.name} payment initiated. Please check your phone to complete the transaction.`,
      provider: request.provider,
      status: 'initiated'
    };
  }

  /**
   * Check payment status from provider
   */
  async checkPaymentStatus(provider: string, transactionId: string): Promise<MobileMoneyResponse> {
    try {
      const config = this.providerConfigs[provider as keyof typeof this.providerConfigs];
      
      // In production, call actual provider API to check status
      // For now, simulate status check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate completed payment
      return {
        success: true,
        transactionId,
        message: `${config.name} payment completed successfully`,
        provider,
        status: 'completed'
      };
      
    } catch (error) {
      console.error(`Status check error for ${provider}:`, error);
      return {
        success: false,
        message: `Failed to check ${provider} payment status`,
        provider,
        status: 'failed'
      };
    }
  }

  /**
   * Get USSD code for provider
   */
  getUSSDCode(provider: string): string {
    const config = this.providerConfigs[provider as keyof typeof this.providerConfigs];
    return config?.ussdCode || '';
  }

  /**
   * Format phone number for provider
   */
  formatPhoneNumber(phone: string, provider: string): string {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ensure it starts with 0 and is 10 digits
    if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      return cleanPhone;
    }
    
    return phone;
  }

  /**
   * Validate phone number for specific provider
   */
  validatePhoneNumber(phone: string, provider: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      return false;
    }

    const providerPrefixes = {
      azampesa: ['065', '067', '068', '071', '074'],
      mpesa: ['075', '076', '077', '078'],
      halopesa: ['062', '063', '064', '069'],
      airtelmoney: ['068', '069', '078', '079'],
      tigopesa: ['065', '067', '071', '072']
    };

    const prefixes = providerPrefixes[provider as keyof typeof providerPrefixes];
    const prefix = cleanPhone.substring(0, 3);
    
    return prefixes.includes(prefix);
  }
}

export const mobileMoneyService = new MobileMoneyService();
