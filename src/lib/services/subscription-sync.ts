import { createServiceRoleClient } from '@/utils/supabase/admin';
import type { PlanId } from '@/lib/config/plans';
import type Stripe from 'stripe';
import { setCachedBillingInterval } from '@/lib/services/billing';
import { getStripeClient } from './stripe';

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Sync subscription data from Stripe to database
 * This is used by both webhooks and checkout success page as a fallback
 */
/**
 * Find and sync the active subscription for a customer
 * Also tries to find active subscriptions by searching all subscriptions for the user
 */
export async function syncActiveSubscriptionForCustomer(
  customerId: string,
  userId?: string
): Promise<{ userId: string; planId: PlanId } | null> {
  const stripe = getStripeClient();
  const supabase = createServiceRoleClient();

  try {
    // First, try to find active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      expand: ['data.items.data.price'],
    });

    // Find active subscription (active, trialing, or past_due)
    let activeSubscription = subscriptions.data.find(
      (sub) => sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
    );

    // If no active subscription found for this customer, try searching by userId metadata
    if (!activeSubscription && userId) {
      // Search all subscriptions with this userId in metadata
      const allSubscriptions = await stripe.subscriptions.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 100,
        expand: ['data.items.data.price'],
      });

      // Find active subscription from all subscriptions
      activeSubscription = allSubscriptions.data.find(
        (sub) => sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      );
    }

    if (!activeSubscription) {
      return null;
    }

    // Retrieve the full subscription object to ensure we have all fields (especially current_period_end)
    // This is important because search results might not include all fields
    const fullSubscription = await stripe.subscriptions.retrieve(activeSubscription.id, {
      expand: ['items.data.price'],
    });

    // Sync the active subscription
    return await syncSubscriptionToDatabase(fullSubscription);
  } catch (error) {
    console.error(`[syncActiveSubscriptionForCustomer] Failed to sync active subscription for customer ${customerId}:`, error);
    return null;
  }
}

/**
 * Manually sync a subscription by ID - useful for fixing missing data
 */
export async function syncSubscriptionById(
  subscriptionId: string
): Promise<{ userId: string; planId: PlanId } | null> {
  const supabase = createServiceRoleClient();
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price', 'latest_invoice'],
    });

    const result = await syncSubscriptionToDatabase(subscription);

    return result;
  } catch (error) {
    console.error(`[syncSubscriptionById] Failed to sync subscription ${subscriptionId}:`, error);
    return null;
  }
}

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

  // Resolve plan - handle canceled/unpaid subscriptions carefully
  // Canceled subscriptions remain active until current_period_end
  // Only downgrade to free if period has ended or subscription is truly inactive
  let planId: PlanId | null = null;

  // Access current_period_end - Stripe returns it as a Unix timestamp (seconds)
  const currentPeriodEnd = subscription.current_period_end;
  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null;
  const now = new Date();
  // If we can't determine period end, assume period is still active (conservative approach)
  const periodHasEnded = periodEndDate ? periodEndDate < now : false;

  // For canceled subscriptions: keep plan active if period hasn't ended
  // For other inactive statuses: downgrade immediately
  const isUnpaidOrIncomplete = subscription.status === 'unpaid' ||
    subscription.status === 'incomplete_expired' ||
    subscription.status === 'incomplete';
  const isCanceled = subscription.status === 'canceled';

  if (isCanceled && !periodHasEnded) {
    // Canceled but period still active - resolve plan from subscription to keep access
    planId = resolvePlanFromSubscription(subscription);
    if (!planId) {
      console.error('[syncSubscriptionToDatabase] Could not resolve plan for canceled subscription', {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        metadata: subscription.metadata,
      });
      return null;
    }
  } else if (isCanceled && periodHasEnded) {
    // Canceled and period ended - downgrade to free
    planId = 'free';
  } else if (isUnpaidOrIncomplete) {
    // Unpaid or incomplete - downgrade immediately
    planId = 'free';
  } else {
    // Active subscription - resolve plan normally
    planId = resolvePlanFromSubscription(subscription);
    if (!planId) {
      console.error('[syncSubscriptionToDatabase] Could not resolve plan', {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        metadata: subscription.metadata,
      });
      return null;
    }
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
  // Note: currentPeriodEnd is already defined above (line 193), so we reuse it here
  // If current_period_end is not on the subscription object, try getting it from upcoming invoices
  // or calculate it from billing cycle anchor + interval
  let periodEndTimestamp = currentPeriodEnd;

  if (!periodEndTimestamp) {
    const stripe = getStripeClient();
    const customerId = getStripeCustomerId(subscription);

    // Try getting from upcoming invoices
    try {
      const upcomingInvoices = await stripe.invoices.list({
        customer: customerId,
        subscription: subscription.id,
        status: 'draft',
        limit: 1,
      });

      if (upcomingInvoices.data.length > 0) {
        const upcomingInvoice = upcomingInvoices.data[0];
        periodEndTimestamp = (upcomingInvoice as any).period_end;
      }
    } catch (invoiceError) {
      // Silently fail - will try calculation fallback
    }

    // If still no period end, try calculating from billing cycle anchor
    if (!periodEndTimestamp) {
      const billingCycleAnchor = (subscription as any).billing_cycle_anchor;
      const interval = priceInterval; // 'month' or 'year'
      if (billingCycleAnchor && interval) {
        const anchorDate = new Date(billingCycleAnchor * 1000);
        const nowDate = new Date();
        // Calculate how many periods have passed since anchor
        let periodsPassed = 0;
        if (interval === 'month') {
          const monthsDiff = (nowDate.getFullYear() - anchorDate.getFullYear()) * 12 +
            (nowDate.getMonth() - anchorDate.getMonth());
          periodsPassed = Math.floor(monthsDiff);
        } else if (interval === 'year') {
          periodsPassed = nowDate.getFullYear() - anchorDate.getFullYear();
        }
        // Calculate next period end
        const nextPeriodEnd = new Date(anchorDate);
        if (interval === 'month') {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + periodsPassed + 1);
        } else if (interval === 'year') {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + periodsPassed + 1);
        }
        periodEndTimestamp = Math.floor(nextPeriodEnd.getTime() / 1000);
      }
    }
  }

  const subscriptionPeriodEnd = periodEndTimestamp
    ? new Date(periodEndTimestamp * 1000).toISOString()
    : null;

  const updateData = {
    plan: planId,
    plan_updated_at: new Date().toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_period_end: subscriptionPeriodEnd,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end || !!subscription.cancel_at,
    stripe_price_id: subscription.items.data[0]?.price.id,
    billing_interval: billingInterval,
  };

  // Split update into two parts to avoid type casting issues:
  // 1. Update plan field using RPC function with explicit type casting (bypasses Supabase client validation)
  // 2. Update rest of the fields normally

  // First, update all fields EXCEPT plan
  const { plan: _, plan_updated_at: __, ...restOfFields } = updateData;
  const { error: restError } = await supabase
    .from('profiles')
    .update(restOfFields)
    .eq('id', userId);

  // Then update plan using RPC function that does explicit type casting to plan_type
  // This bypasses Supabase client's type validation that references user_plan
  const { error: planError, data: rpcData } = await (supabase as any).rpc('update_user_plan', {
    p_user_id: userId,
    p_plan: planId,
    p_plan_updated_at: updateData.plan_updated_at,
  });

  if (planError) {
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
        rpcErrorCode: planError.code,
        fallbackError: fallbackError.message,
        fallbackErrorCode: fallbackError.code,
      });
    }
  }

  const error = planError || restError;

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
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }

  const customerId = getStripeCustomerId(subscription);
  if (!customerId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve user by stripe_customer_id: ${error.message}`);
  }

  return data?.id ?? null;
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription): PlanId | null {
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === 'started' || metadataPlan === 'pro') {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;

  const planFromPrice = getPlanIdFromPriceId(priceId);
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
