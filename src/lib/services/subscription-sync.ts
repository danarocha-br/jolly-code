import { createServiceRoleClient } from '@/utils/supabase/admin';
import type { PlanId } from '@/lib/config/plans';
import type Stripe from 'stripe';
import { setCachedBillingInterval } from '@/lib/services/billing';

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Sync subscription data from Stripe to database
 * This is used by both webhooks and checkout success page as a fallback
 */
export async function syncSubscriptionToDatabase(
  subscription: Stripe.Subscription
): Promise<{ userId: string; planId: PlanId } | null> {
  const supabase = createServiceRoleClient();

  // Resolve user ID
  const userId = await resolveUserIdFromSubscription(subscription, supabase);
  if (!userId) {
    console.error('[syncSubscriptionToDatabase] Could not resolve userId', {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    return null;
  }

  // Resolve plan
  const planId = resolvePlanFromSubscription(subscription);
  if (!planId) {
    console.error('[syncSubscriptionToDatabase] Could not resolve plan', {
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
      metadata: subscription.metadata,
    });
    return null;
  }

  const customerId = getStripeCustomerId(subscription);
  if (!customerId) {
    console.error('[syncSubscriptionToDatabase] No customer ID', {
      subscriptionId: subscription.id,
    });
    return null;
  }

  // Extract billing interval
  const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
  const billingInterval = priceInterval === 'month' ? 'monthly' : priceInterval === 'year' ? 'yearly' : null;

  // Convert current_period_end from Unix timestamp (seconds) to ISO string
  const subscriptionPeriodEnd = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000).toISOString()
    : null;

  const updateData = {
    plan: planId,
    plan_updated_at: new Date().toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_period_end: subscriptionPeriodEnd,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? null,
    stripe_price_id: subscription.items.data[0]?.price.id,
    billing_interval: billingInterval,
  };

  // #region agent log
  console.log('[DEBUG] syncSubscriptionToDatabase updating database', {
    userId,
    planId,
    subscriptionId: subscription.id,
    hypothesisId: 'D',
  });
  // #endregion

  // Split update into two parts to avoid type casting issues:
  // 1. Update plan field using RPC function with explicit type casting (bypasses Supabase client validation)
  // 2. Update rest of the fields normally
  
  // First, update all fields EXCEPT plan
  const { plan: _, plan_updated_at: __, ...restOfFields } = updateData;
  const { error: restError } = await supabase
    .from('profiles')
    .update(restOfFields)
    .eq('id', userId);

  if (restError) {
    // #region agent log
    console.log('[DEBUG] syncSubscriptionToDatabase rest fields update failed', {
      error: restError.message,
      hypothesisId: 'D',
    });
    // #endregion
  }

  // Then update plan using RPC function that does explicit type casting to plan_type
  // This bypasses Supabase client's type validation that references user_plan
  const { error: planError } = await (supabase as any).rpc('update_user_plan', {
    p_user_id: userId,
    p_plan: planId,
    p_plan_updated_at: updateData.plan_updated_at,
  });

  if (planError) {
    // #region agent log
    console.log('[DEBUG] syncSubscriptionToDatabase plan update via RPC failed', {
      error: planError.message,
      hypothesisId: 'D',
    });
    // #endregion
    // Fallback: try direct update with type assertion as last resort
    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({
        plan: planId as any,
        plan_updated_at: updateData.plan_updated_at,
      } as any)
      .eq('id', userId);
    
    if (fallbackError) {
      console.error('[syncSubscriptionToDatabase] Both RPC and fallback plan update failed', {
        rpcError: planError.message,
        fallbackError: fallbackError.message,
      });
    }
  }

  const error = planError || restError;

  // #region agent log
  console.log('[DEBUG] syncSubscriptionToDatabase database update result', {
    hasError: !!error,
    errorMessage: error?.message,
    updatedPlan: planId,
    hypothesisId: 'D',
  });
  // #endregion

  if (error) {
    console.error('[syncSubscriptionToDatabase] Database update failed', error);
    throw error;
  }

  // Update cache
  if (billingInterval && subscription.id) {
    setCachedBillingInterval(subscription.id, billingInterval);
  }

  // Reconcile over-limit flags
  const { error: reconcileError } = await (supabase as any).rpc('reconcile_over_limit_content', {
    p_user_id: userId,
  });

  if (reconcileError) {
    console.error('[syncSubscriptionToDatabase] Failed to reconcile over-limit content', reconcileError);
  }

  console.log(`[syncSubscriptionToDatabase] Updated user ${userId} to plan ${planId}`);
  return { userId, planId };
}

function getStripeCustomerId(
  stripeObject: Stripe.Subscription | Stripe.Invoice | Stripe.Checkout.Session
): string | null {
  const customer = (stripeObject as { customer?: string | Stripe.Customer | null }).customer;
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription,
  supabase: ServiceRoleClient
): Promise<string | null> {
  // #region agent log
  console.log('[DEBUG] resolveUserIdFromSubscription entry', {
    subscriptionId: subscription.id,
    hasMetadataUserId: !!subscription.metadata?.userId,
    metadata: subscription.metadata,
    hypothesisId: 'B',
  });
  // #endregion

  if (subscription.metadata?.userId) {
    // #region agent log
    console.log('[DEBUG] resolveUserIdFromSubscription found in metadata', {
      userId: subscription.metadata.userId,
      hypothesisId: 'B',
    });
    // #endregion
    return subscription.metadata.userId;
  }

  const customerId = getStripeCustomerId(subscription);
  // #region agent log
  console.log('[DEBUG] resolveUserIdFromSubscription checking customerId', {
    customerId,
    hasCustomerId: !!customerId,
    hypothesisId: 'B',
  });
  // #endregion

  if (!customerId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  // #region agent log
  console.log('[DEBUG] resolveUserIdFromSubscription customer lookup result', {
    userId: data?.id,
    hasError: !!error,
    errorMessage: error?.message,
    hypothesisId: 'B',
  });
  // #endregion

  if (error) {
    throw new Error(`Failed to resolve user by stripe_customer_id: ${error.message}`);
  }

  return data?.id ?? null;
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription): PlanId | null {
  // #region agent log
  console.log('[DEBUG] resolvePlanFromSubscription entry', {
    subscriptionId: subscription.id,
    metadataPlan: subscription.metadata?.plan,
    metadata: subscription.metadata,
    hypothesisId: 'C',
  });
  // #endregion

  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === 'started' || metadataPlan === 'pro') {
    // #region agent log
    console.log('[DEBUG] resolvePlanFromSubscription found in metadata', {
      planId: metadataPlan,
      hypothesisId: 'C',
    });
    // #endregion
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;
  // #region agent log
  console.log('[DEBUG] resolvePlanFromSubscription checking priceId', {
    priceId,
    hasPriceId: !!priceId,
    hypothesisId: 'C',
  });
  // #endregion

  if (!priceId) return null;

  const planFromPrice = getPlanIdFromPriceId(priceId);
  // #region agent log
  console.log('[DEBUG] resolvePlanFromSubscription result from priceId', {
    planFromPrice,
    hypothesisId: 'C',
  });
  // #endregion

  return planFromPrice;
}

function getPlanIdFromPriceId(priceId: string): PlanId | null {
  const priceIdMap: Record<string, PlanId> = {};

  const startedMonthly = process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID;
  const startedYearly = process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID;
  const proMonthly = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;
  const proYearly = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;

  if (startedMonthly) priceIdMap[startedMonthly] = 'started';
  if (startedYearly) priceIdMap[startedYearly] = 'started';
  if (proMonthly) priceIdMap[proMonthly] = 'pro';
  if (proYearly) priceIdMap[proYearly] = 'pro';

  return priceIdMap[priceId] || null;
}
