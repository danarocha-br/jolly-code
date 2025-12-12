import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  getStripePriceId,
} from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import { enforceRateLimit, publicLimiter, strictLimiter } from '@/lib/arcjet/limiters';
import { resolveBaseUrl } from '@/lib/utils/resolve-base-url';
import type { Database } from '@/types/database';

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
    let body: CheckoutRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
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
      .select('username, stripe_customer_id')
      .eq('id', user.id)
      .single();

    const typedProfile: Pick<
      Database['public']['Tables']['profiles']['Row'],
      'username' | 'stripe_customer_id'
    > | null = profile;

    if (!user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: typedProfile?.username ?? undefined,
    });

    // Update profile with Stripe customer ID if not already set
    const existingCustomerId = typedProfile?.stripe_customer_id;
    if (!existingCustomerId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
      if (updateError) {
        console.warn('Failed to update stripe_customer_id:', updateError);
      }
    }

    // Check if user already has an active subscription
    // We check the profile first as it's faster than Stripe API
    const { data: subscriptionData } = await supabase
      .from('profiles')
      .select('stripe_subscription_status')
      .eq('id', user.id)
      .single();

    const hasActiveSubscription =
      subscriptionData?.stripe_subscription_status === 'active' ||
      subscriptionData?.stripe_subscription_status === 'trialing';

    if (hasActiveSubscription) {
      return NextResponse.json(
        {
          error: 'You already have an active subscription. Please use the customer portal to manage your plan.',
          code: 'ACTIVE_SUBSCRIPTION_EXISTS'
        },
        { status: 409 }
      );
    }

    // Get price ID for the plan
    let priceId: string;
    try {
      priceId = getStripePriceId(plan, interval);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get Stripe price ID:', errorMessage);
      return NextResponse.json(
        {
          error: `Checkout configuration error: ${errorMessage}. Please contact support if this issue persists.`,
        },
        { status: 500 }
      );
    }

    // Validate price ID before proceeding
    if (!priceId || priceId.trim() === '') {
      return NextResponse.json(
        {
          error: 'Checkout configuration error: Stripe price ID is missing. Please contact support.',
        },
        { status: 500 }
      );
    }

    // Create checkout session
    const appUrl = resolveBaseUrl(request.headers);
    let session;
    try {
      session = await createCheckoutSession({
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create Stripe checkout session:', errorMessage);
      // If it's a validation error from createCheckoutSession, return it directly
      if (errorMessage.includes('Invalid Stripe price ID') || errorMessage.includes('price ID')) {
        return NextResponse.json(
          {
            error: `Checkout configuration error: ${errorMessage}. Please contact support.`,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
