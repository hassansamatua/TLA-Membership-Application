'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>('loading');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const orderTrackingId = searchParams.get('OrderTrackingId');
    const orderMerchantReference = searchParams.get('OrderMerchantReference');
    
    if (!orderTrackingId || !orderMerchantReference) {
      setStatus('error');
      setMessage('Invalid payment response. Missing required parameters.');
      return;
    }

    // In a real app, you would verify the payment status with PesaPal's API here
    // For now, we'll simulate a successful payment after a short delay
    const timer = setTimeout(() => {
      // Check if the user cancelled the payment
      if (searchParams.get('status') === 'cancelled') {
        setStatus('cancelled');
        setMessage('Payment was cancelled. Your account has not been charged.');
        return;
      }
      
      // Simulate API call to verify payment
      verifyPayment(orderTrackingId, orderMerchantReference);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const verifyPayment = async (orderTrackingId: string, reference: string) => {
    try {
      // In a real app, you would make an API call to your backend
      // which would then verify the payment with PesaPal's API
      // const response = await fetch(`/api/payment/verify?orderTrackingId=${orderTrackingId}&reference=${reference}`);
      // const data = await response.json();
      
      // For demo purposes, we'll simulate a successful payment
      setStatus('success');
      setMessage('Payment successful! Your account has been updated.');
      
      // Here you would typically update the user's account in your database
      // await updateUserAccount(reference);
      
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage('There was an error processing your payment. Please contact support.');
    }
  };

  const handleRetry = () => {
    router.push('/dashboard/payment');
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="p-4 rounded-full bg-muted">
          {renderStatusIcon()}
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">
          {status === 'loading' && 'Processing Payment...'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'error' && 'Payment Error'}
          {status === 'cancelled' && 'Payment Cancelled'}
        </h1>
        
        <p className="text-muted-foreground text-lg">
          {message}
        </p>
        
        <div className="pt-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {status === 'success' ? (
            <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
          ) : status === 'error' || status === 'cancelled' ? (
            <Button onClick={handleRetry} className="w-full sm:w-auto">
              Try Again
            </Button>
          ) : null}
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/')} 
            className="w-full sm:w-auto"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
