'use server';

import type { PlanId } from '@/lib/config/plans';
import { createClient } from '@/utils/supabase/server';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession as createStripeCheckoutSession,
  getStripePriceId,
  createCustomerPortalSession,
} from '@/lib/services/stripe';
import { resolveBaseUrl } from '@/lib/utils/resolve-base-url';

type CheckoutResponse = {
  url?: string;
  error?: string;
};

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  plan,
  interval,
  headers,
}: {
  plan: PlanId;
  interval: 'monthly' | 'yearly';
  headers?: { get(name: string): string | null } | null;
}): Promise<CheckoutResponse> {
  try {
    // Validate plan
    if (plan === 'free') {
      return { error: 'Cannot create checkout session for free plan' };
    }

    if (!['started', 'pro'].includes(plan)) {
      return { error: 'Invalid plan' };
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return { error: 'Invalid billing interval' };
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    if (!user.email) {
      return { error: 'User email not found' };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: profile?.username || undefined,
    });

    // Update profile with Stripe customer ID if not already set
    const existingCustomerId = profile?.stripe_customer_id;

    if (!existingCustomerId) {
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id } as any)
        .eq('id', user.id);
    }

    // Get price ID for the plan
    const priceId = getStripePriceId(plan, interval);

    // Create checkout session
    const appUrl = resolveBaseUrl(headers);
    const session = await createStripeCheckoutSession({
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

    return { url: session.url || undefined };
  } catch (error) {
    console.error('Checkout action error:', error);
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession({
  headers,
}: {
  headers?: { get(name: string): string | null } | null;
} = {}): Promise<CheckoutResponse> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      return { error: 'No active subscription found' };
    }

    // Create customer portal session
    const appUrl = resolveBaseUrl(headers);
    const portalSession = await createCustomerPortalSession({
      customerId: stripeCustomerId,
      returnUrl: `${appUrl}/`,
    });

    return { url: portalSession.url || undefined };
  } catch (error) {
    console.error('Portal action error:', error);
    return { error: 'Failed to create portal session' };
  }
}
