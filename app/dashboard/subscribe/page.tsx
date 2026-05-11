'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get membership type from URL params
    const typeParam = searchParams.get('type');
    const membershipType = typeParam === 'organization' ? 'organization' : 'personal';
    
    // Redirect to the new payment page with the membership type
    router.push(`/dashboard/payment?type=${membershipType}`);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to payment page...</p>
      </div>
    </div>
  );
}
