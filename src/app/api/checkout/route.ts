import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  getStripePriceId,
} from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import { authedLimiter, enforceRateLimit, publicLimiter, strictLimiter } from '@/lib/arcjet/limiters';

export const dynamic = 'force-dynamic';

type CheckoutRequestBody = {
  plan: PlanId;
  interval: 'monthly' | 'yearly';
};

export async function POST(request: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["checkout:create"],
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
      tags: ["checkout:create", "user"],
    });
    if (userLimited) return userLimited;

    // Parse request body
    const body: CheckoutRequestBody = await request.json();
    const { plan, interval } = body;

    // Validate plan
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Cannot create checkout session for free plan' },
        { status: 400 }
      );
    }

    if (!['started', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: (profile as any)?.username || undefined,
    });

    // Update profile with Stripe customer ID if not already set
    const existingCustomerId = (profile as any)?.stripe_customer_id;
    if (!existingCustomerId) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id } as any)
        .eq('id', user.id);
    }

    // Get price ID for the plan
    const priceId = getStripePriceId(plan, interval);

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/checkout/canceled?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
