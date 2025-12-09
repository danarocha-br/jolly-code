import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createCustomerPortalSession } from '@/lib/services/stripe';
import { enforceRateLimit, publicLimiter, strictLimiter } from '@/lib/arcjet/limiters';
import { env } from '@/env.mjs';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'stripe_customer_id'>;

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
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Create customer portal session
    const portalSession = await createCustomerPortalSession({
      customerId: stripeCustomerId,
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/`,
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
