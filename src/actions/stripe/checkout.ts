'use server';

import type { PlanId } from '@/lib/config/plans';
import { createClient } from '@/utils/supabase/server';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession as createStripeCheckoutSession,
  getStripePriceId,
  createCustomerPortalSession,
} from '@/lib/services/stripe';
import { syncSubscriptionById, syncActiveSubscriptionForCustomer } from '@/lib/services/subscription-sync';
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

    // Check if user already has an active subscription
    const { data: subscriptionData } = await supabase
      .from('profiles')
      .select('stripe_subscription_status')
      .eq('id', user.id)
      .single();

    const hasActiveSubscription =
      subscriptionData?.stripe_subscription_status === 'active' ||
      subscriptionData?.stripe_subscription_status === 'trialing';

    if (hasActiveSubscription) {
      return {
        error: 'You already have an active subscription. Please manage your plan in the customer portal.'
      };
    }

    // Get price ID for the plan
    let priceId: string;
    try {
      priceId = getStripePriceId(plan, interval);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get Stripe price ID:', errorMessage);
      return {
        error: `Checkout configuration error: ${errorMessage}. Please contact support if this issue persists.`,
      };
    }

    // Validate price ID before proceeding
    if (!priceId || priceId.trim() === '') {
      return {
        error:
          'Checkout configuration error: Stripe price ID is missing. Please contact support.',
      };
    }

    // Create checkout session
    const appUrl = resolveBaseUrl(headers);
    let session;
    try {
      session = await createStripeCheckoutSession({
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
        return {
          error: `Checkout configuration error: ${errorMessage}. Please contact support.`,
        };
      }
      return { error: 'Failed to create checkout session. Please try again later.' };
    }

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

/**
 * Sync subscription data from Stripe
 * If subscriptionId is provided, syncs that specific subscription.
 * Otherwise, finds and syncs the active subscription for the user's customer.
 */
export async function syncSubscription({
  subscriptionId,
}: {
  subscriptionId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get user profile with customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single();

    let result: { userId: string; planId: PlanId } | null = null;

    if (subscriptionId) {
      // If subscriptionId is provided, verify it belongs to the user
      if (profile?.stripe_subscription_id !== subscriptionId) {
        return { success: false, error: 'Subscription does not belong to user' };
      }

      result = await syncSubscriptionById(subscriptionId);
    } else {
      // No subscriptionId provided - find and sync active subscription
      if (!profile?.stripe_customer_id) {
        return { success: false, error: 'No Stripe customer found' };
      }

      result = await syncActiveSubscriptionForCustomer(profile.stripe_customer_id, user.id);
    }

    if (!result) {
      return { success: false, error: 'Failed to sync subscription' };
    }

    // Invalidate usage cache so the UI reflects the new plan immediately
    try {
      const { invalidateUserUsageCache } = await import('@/lib/services/usage-limits-cache');
      invalidateUserUsageCache(user.id);
    } catch (error) {
      console.warn('Failed to invalidate usage cache:', error);
      // Don't fail the sync action just because cache invalidation failed
    }

    return { success: true };
  } catch (error) {
    console.error('Sync subscription action error:', error);
    return { success: false, error: 'Failed to sync subscription' };
  }
}
