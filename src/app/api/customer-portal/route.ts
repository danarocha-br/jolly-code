import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createCustomerPortalSession } from '@/lib/services/stripe';
import { enforceRateLimit, publicLimiter, strictLimiter } from '@/lib/arcjet/limiters';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["customer-portal"],
    });
    if (limitResponse) return limitResponse;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userLimited = await enforceRateLimit(strictLimiter, request, {
      userId: user.id,
      tags: ["customer-portal", "user"],
    });
    if (userLimited) return userLimited;

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const stripeCustomerId = (profile as any)?.stripe_customer_id;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Create customer portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalSession = await createCustomerPortalSession({
      customerId: stripeCustomerId,
      returnUrl: `${appUrl}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
