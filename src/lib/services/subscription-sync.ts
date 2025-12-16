import { createServiceRoleClient } from '@/utils/supabase/admin';
import type { PlanId } from '@/lib/config/plans';
import type Stripe from 'stripe';
import { setCachedBillingInterval } from '@/lib/services/billing';
import { getStripeClient } from './stripe';
import { getStripeCustomerId, resolveUserIdFromSubscription, getPlanIdFromPriceId, getPriceIdMap } from './stripe-helpers';

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
  // According to Stripe docs, current_period_start and current_period_end are always present
  // For flexible billing mode subscriptions, these fields are on subscription items, not the subscription itself
  // Try subscription object first, then check subscription items
  let currentPeriodEnd = subscription.current_period_end ?? (subscription as any).current_period_end;
  let currentPeriodStart = subscription.current_period_start ?? (subscription as any).current_period_start;

  // If missing on subscription object, check subscription items (for flexible billing mode)
  if (!currentPeriodEnd || !currentPeriodStart) {
    const firstItem = subscription.items?.data?.[0];
    if (firstItem) {
      // For flexible billing, period dates are on the subscription item
      const itemPeriodEnd = (firstItem as any).current_period_end;
      const itemPeriodStart = (firstItem as any).current_period_start;

      if (!currentPeriodEnd && itemPeriodEnd) {
        currentPeriodEnd = itemPeriodEnd;
      }
      if (!currentPeriodStart && itemPeriodStart) {
        currentPeriodStart = itemPeriodStart;
      }
    }
  }

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

  // LOGIC FIX: Prioritize cancel_at if set, as that represents the true end of service for scheduled cancellations
  // In Stripe Test Clock scenarios or specific scheduling, cancel_at might differ or be the source of truth
  // According to Stripe docs, current_period_end should always be present for active subscriptions
  // If it's missing, try to get from latest_invoice, then calculate from current_period_start + interval
  const cancelAtCallback = subscription.cancel_at;
  let periodEndTimestamp = cancelAtCallback || currentPeriodEnd;

  // If current_period_end is missing, try latest_invoice.period_end
  if (!periodEndTimestamp && subscription.latest_invoice) {
    const latestInvoice = typeof subscription.latest_invoice === 'string'
      ? null
      : subscription.latest_invoice;
    if (latestInvoice && (latestInvoice as any).period_end) {
      periodEndTimestamp = (latestInvoice as any).period_end;
    }
  }

  // If still missing but current_period_start exists, calculate it
  if (!periodEndTimestamp && currentPeriodStart && priceInterval) {
    const periodStartDate = new Date(currentPeriodStart * 1000);
    const calculatedEndDate = new Date(periodStartDate);

    if (priceInterval === 'month') {
      calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
    } else if (priceInterval === 'year') {
      calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
    }

    periodEndTimestamp = Math.floor(calculatedEndDate.getTime() / 1000);
  }

  // Also try to get current_period_start from latest_invoice if missing
  if (!currentPeriodStart && subscription.latest_invoice && priceInterval) {
    const latestInvoice = typeof subscription.latest_invoice === 'string'
      ? null
      : subscription.latest_invoice;
    if (latestInvoice && (latestInvoice as any).period_start) {
      const invoicePeriodStart = (latestInvoice as any).period_start;
      const invoicePeriodStartDate = new Date(invoicePeriodStart * 1000);
      const calculatedEndDate = new Date(invoicePeriodStartDate);

      if (priceInterval === 'month') {
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
      } else if (priceInterval === 'year') {
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
      }

      if (!periodEndTimestamp) {
        periodEndTimestamp = Math.floor(calculatedEndDate.getTime() / 1000);
      }
    }
  }

  if (!periodEndTimestamp && customerId) {
    const stripe = getStripeClient();

    // This fallback should rarely be needed since we calculate from current_period_start above
    // But keep it as a safety net for edge cases
    const fallbackCurrentPeriodStart = subscription.current_period_start ?? (subscription as any).current_period_start;

    if (fallbackCurrentPeriodStart && priceInterval && !periodEndTimestamp) {
      const currentPeriodStart = fallbackCurrentPeriodStart;
      const periodStartDate = new Date(currentPeriodStart * 1000);
      const periodEndDate = new Date(periodStartDate);

      if (priceInterval === 'month') {
        periodEndDate.setMonth(periodEndDate.getMonth() + 1);
      } else if (priceInterval === 'year') {
        periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
      }

      periodEndTimestamp = Math.floor(periodEndDate.getTime() / 1000);
    }

    // If still no period end, try getting from upcoming invoices
    if (!periodEndTimestamp) {
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
    }

    // If still no period end, try calculating from billing cycle anchor or subscription created date
    // This is a fallback - calculate the next period end from the anchor or created date
    if (!periodEndTimestamp) {
      const currentPeriodStart = (subscription as any).current_period_start;
      const billingCycleAnchor = (subscription as any).billing_cycle_anchor;
      const subscriptionCreated = (subscription as any).created;
      const interval = priceInterval; // 'month' or 'year'

      let baseDate: Date | null = null;

      // Priority 1: Use current_period_start if available
      if (currentPeriodStart) {
        baseDate = new Date(currentPeriodStart * 1000);
      }
      // Priority 2: Use billing cycle anchor if it's in the past (not a future date)
      else if (billingCycleAnchor && interval) {
        const anchorDate = new Date(billingCycleAnchor * 1000);
        const nowDate = new Date();

        // Only use anchor if it's in the past (future anchors are likely wrong)
        if (anchorDate <= nowDate) {
          // Find the current period start by calculating how many periods have passed
          let periodsPassed = 0;
          if (interval === 'month') {
            const monthsDiff = (nowDate.getFullYear() - anchorDate.getFullYear()) * 12 +
              (nowDate.getMonth() - anchorDate.getMonth());
            periodsPassed = Math.floor(monthsDiff);
          } else if (interval === 'year') {
            periodsPassed = nowDate.getFullYear() - anchorDate.getFullYear();
          }
          baseDate = new Date(anchorDate);
          if (interval === 'month') {
            baseDate.setMonth(baseDate.getMonth() + periodsPassed);
          } else if (interval === 'year') {
            baseDate.setFullYear(baseDate.getFullYear() + periodsPassed);
          }
        }
      }
      // Priority 3: Use subscription created date as last resort
      if (!baseDate && subscriptionCreated && interval) {
        const createdDate = new Date(subscriptionCreated * 1000);
        const nowDate = new Date();

        // Find the current period start by calculating how many periods have passed since creation
        let periodsPassed = 0;
        if (interval === 'month') {
          const monthsDiff = (nowDate.getFullYear() - createdDate.getFullYear()) * 12 +
            (nowDate.getMonth() - createdDate.getMonth());
          periodsPassed = Math.floor(monthsDiff);
        } else if (interval === 'year') {
          periodsPassed = nowDate.getFullYear() - createdDate.getFullYear();
        }
        baseDate = new Date(createdDate);
        if (interval === 'month') {
          baseDate.setMonth(baseDate.getMonth() + periodsPassed);
        } else if (interval === 'year') {
          baseDate.setFullYear(baseDate.getFullYear() + periodsPassed);
        }
      }

      // Calculate next period end (current period start + 1 interval)
      if (baseDate && interval) {
        const nextPeriodEnd = new Date(baseDate);
        if (interval === 'month') {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        } else if (interval === 'year') {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
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
  const dbPlanValue = planId === 'starter' ? 'started' : planId;
  const { error: planError, data: rpcData } = await (supabase as any).rpc('update_user_plan', {
    p_user_id: userId,
    p_plan: dbPlanValue,
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


  return { userId, planId };
}



function resolvePlanFromSubscription(subscription: Stripe.Subscription): PlanId | null {
  // Try to resolve from Price ID first as it is the source of truth
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId) {
    const planFromPrice = getPlanIdFromPriceId(priceId);
    if (planFromPrice) {
      return planFromPrice;
    }
  }

  // Fallback to metadata if price ID resolution fails (e.g. unknown price)
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === 'starter' || metadataPlan === 'started' || metadataPlan === 'pro') {
    return metadataPlan === 'started' ? 'starter' : (metadataPlan as PlanId);
  }

  // Log error if neither worked
  if (priceId) {
    console.error('[resolvePlanFromSubscription] Failed to resolve plan from price ID', {
      priceId,
      availableMap: JSON.stringify(getPriceIdMap()),
      // Check env vars presence (without leaking values)
      envVars: {
        starterMonthly: !!process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID,
        starterYearly: !!process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
        proMonthly: !!process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
        proYearly: !!process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
      }
    });
  }

  return null;
}

