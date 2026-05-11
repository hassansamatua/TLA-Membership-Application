import { NextResponse } from 'next/server';
import { calculateMembershipPricing } from '@/lib/membership-pricing';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Test different scenarios
    const scenarios = [
      { membershipType: 'personal', isNewUser: true },
      { membershipType: 'personal', isNewUser: false },
      { membershipType: 'organization', isNewUser: true },
      { membershipType: 'organization', isNewUser: false },
    ];

    const results = scenarios.map(scenario => {
      const pricing = calculateMembershipPricing(
        scenario.membershipType as 'personal' | 'organization',
        scenario.isNewUser
      );
      
      return {
        ...scenario,
        pricing,
        explanation: `${scenario.isNewUser ? 'New' : 'Continuing'} ${scenario.membershipType} member: TZS ${pricing.baseAmount.toLocaleString()}${pricing.penaltyAmount > 0 ? ` + TZS ${pricing.penaltyAmount.toLocaleString()} penalty` : ''} = TZS ${pricing.totalDue.toLocaleString()}`
      };
    });

    return NextResponse.json({
      success: true,
      currentDate: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Debug pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to debug pricing' },
      { status: 500 }
    );
  }
}
