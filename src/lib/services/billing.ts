import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getStripeClient } from "./stripe";
import type Stripe from "stripe";
import { syncSubscriptionById } from "./subscription-sync";

type Supabase = SupabaseClient<Database>;

/**
 * In-memory cache for billing intervals keyed by subscription ID
 * Used as a fallback when database value is missing (backwards compatibility)
 * Cache entries expire after 24 hours
 */
type BillingIntervalCacheEntry = {
  interval: "monthly" | "yearly";
  cachedAt: number;
};

const BILLING_INTERVAL_CACHE = new Map<string, BillingIntervalCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get billing interval from cache if available and not expired
 */
function getCachedBillingInterval(
  subscriptionId: string
): "monthly" | "yearly" | null {
  const entry = BILLING_INTERVAL_CACHE.get(subscriptionId);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.cachedAt > CACHE_TTL_MS) {
    // Cache expired, remove it
    BILLING_INTERVAL_CACHE.delete(subscriptionId);
    return null;
  }

  return entry.interval;
}

/**
 * Cache billing interval for a subscription ID
 * Exported for use by webhook handlers to keep cache in sync
 */
export function setCachedBillingInterval(
  subscriptionId: string,
  interval: "monthly" | "yearly"
): void {
  BILLING_INTERVAL_CACHE.set(subscriptionId, {
    interval,
    cachedAt: Date.now(),
  });
}

/**
 * Asynchronously fetch billing interval from Stripe and update both DB and cache
 * This is fire-and-forget and does not block the calling function
 */
async function backfillBillingInterval(
  supabase: Supabase,
  userId: string,
  subscriptionId: string
): Promise<void> {
  try {
    const subscription = await getStripeClient().subscriptions.retrieve(
      subscriptionId
    );
    const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;

    if (priceInterval === "month" || priceInterval === "year") {
      const billingInterval = priceInterval === "month" ? "monthly" : "yearly";

      // Update cache immediately
      setCachedBillingInterval(subscriptionId, billingInterval);

      // Update database
      const { error } = await supabase
        .from("profiles")
        .update({ billing_interval: billingInterval })
        .eq("id", userId);

      if (error) {
        console.error(
          `Failed to update billing_interval in DB for user ${userId}:`,
          error
        );
      } else {
        console.log(
          `Backfilled billing_interval for user ${userId}: ${billingInterval}`
        );
      }
    }
  } catch (error) {
    console.error(
      `Failed to backfill billing_interval from Stripe for subscription ${subscriptionId}:`,
      error
    );
  }
}

/**
 * Asynchronously sync subscription period end from Stripe
 * This is fire-and-forget and does not block the calling function
 * Used as a safety net when webhooks fail or data is missing
 */
async function backfillSubscriptionPeriodEnd(
  supabase: Supabase,
  userId: string,
  subscriptionId: string
): Promise<void> {
  try {
    const result = await syncSubscriptionById(subscriptionId);

    if (result) {
      console.log(
        `Backfilled subscription_period_end for user ${userId} via subscription ${subscriptionId}`
      );
    } else {
      console.warn(
        `Failed to backfill subscription_period_end for user ${userId}: sync returned null`
      );
    }
  } catch (error) {
    console.error(
      `Failed to backfill subscription_period_end from Stripe for subscription ${subscriptionId}:`,
      error
    );
  }
}

export type BillingInfo = {
  plan: Database["public"]["Enums"]["plan_type"];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean | null;
  stripePriceId: string | null;
  billingInterval: "monthly" | "yearly" | null;
};

/**
 * Check if a subscription is active based on its status
 * Returns true for 'active', 'trialing', or 'past_due' statuses
 */
export function hasActiveSubscription(billingInfo: BillingInfo | null | undefined): boolean {
  if (!billingInfo?.stripeSubscriptionStatus) {
    return false;
  }
  const status = billingInfo.stripeSubscriptionStatus;
  return status === "active" || status === "trialing" || status === "past_due";
}

export type PaymentMethodInfo = {
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
};

export type InvoiceInfo = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
};

/**
 * Get billing information from user profile
 */
export async function getBillingInfo(
  supabase: Supabase,
  userId: string
): Promise<BillingInfo | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, subscription_period_end, subscription_cancel_at_period_end, stripe_price_id, billing_interval"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    if (error) {
      console.error("Error fetching billing info:", error);
    }
    return null;
  }

  // Use billing interval from database if available
  let billingInterval: "monthly" | "yearly" | null = (data.billing_interval as "monthly" | "yearly" | null) || null;

  // Fallback to cache if not in database (for backward compatibility)
  if (!billingInterval && data.stripe_subscription_id) {
    billingInterval = getCachedBillingInterval(data.stripe_subscription_id);

    // If still missing, log alert and trigger async backfill (non-blocking)
    if (!billingInterval) {
      console.warn(
        `[BILLING_INTERVAL_MISSING] User ${userId} has subscription ${data.stripe_subscription_id} but billing_interval is missing from DB and cache. ` +
        `This should be backfilled via webhook or migration. Triggering async backfill.`
      );

      // Fire-and-forget async backfill (does not block this request)
      backfillBillingInterval(supabase, userId, data.stripe_subscription_id).catch(
        (error) => {
          console.error(
            `Failed to backfill billing_interval for user ${userId}:`,
            error
          );
        }
      );
    }
  }

  // Automatic background sync for missing subscription_period_end
  // This ensures production reliability - webhooks should handle this, but we backfill if missing
  if (!data.subscription_period_end && data.stripe_subscription_id && data.stripe_subscription_status === 'active') {
    console.warn(
      `[SUBSCRIPTION_PERIOD_END_MISSING] User ${userId} has active subscription ${data.stripe_subscription_id} but subscription_period_end is missing. ` +
      `This should be set via webhook. Triggering async sync.`
    );

    // Fire-and-forget async sync (does not block this request)
    backfillSubscriptionPeriodEnd(supabase, userId, data.stripe_subscription_id).catch(
      (error) => {
        console.error(
          `Failed to backfill subscription_period_end for user ${userId}:`,
          error
        );
      }
    );
  }

  return {
    plan: data.plan,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripeSubscriptionStatus: data.stripe_subscription_status,
    subscriptionPeriodEnd: data.subscription_period_end,
    subscriptionCancelAtPeriodEnd: data.subscription_cancel_at_period_end,
    stripePriceId: data.stripe_price_id,
    billingInterval,
  };
}

/**
 * Helper function to retrieve and format a payment method
 */
async function retrievePaymentMethodById(
  paymentMethodId: string
): Promise<PaymentMethodInfo | null> {
  try {
    const paymentMethod = await getStripeClient().paymentMethods.retrieve(
      paymentMethodId
    );

    if (paymentMethod.type === "card" && paymentMethod.card) {
      return {
        type: "card",
        card: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        },
      };
    }
    return null;
  } catch (pmError: any) {
    // Payment method might not exist or be accessible
    if (pmError?.code !== "resource_missing") {
      console.error("Error retrieving payment method:", pmError);
      throw pmError;
    }
    return null;
  }
}

/**
 * Get payment method from Stripe customer or subscription
 * Checks customer's default payment method first, then all customer payment methods,
 * then falls back to subscription's payment method
 */
export async function getPaymentMethod(
  customerId: string,
  subscriptionId?: string | null
): Promise<PaymentMethodInfo | null> {
  try {
    const customer = await getStripeClient().customers.retrieve(customerId);

    if (customer.deleted || typeof customer === "string") {
      return null;
    }

    // First, try customer's default payment method
    if (customer.invoice_settings?.default_payment_method) {
      const paymentMethodId =
        typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method.id;

      const paymentMethod = await retrievePaymentMethodById(paymentMethodId);
      if (paymentMethod) {
        return paymentMethod;
      }
    }

    // If no default payment method, check all customer payment methods
    try {
      const paymentMethods = await getStripeClient().paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      for (const pm of paymentMethods.data) {
        if (pm.type === 'card' && pm.card) {
          return {
            type: "card",
            card: {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            },
          };
        }
      }
    } catch (pmListError: any) {
      // Payment methods listing failed, continue to subscription check
    }

    // Fallback: Check subscription's payment method if subscription ID is provided
    if (subscriptionId) {
      try {
        const subscription = await getStripeClient().subscriptions.retrieve(
          subscriptionId,
          { expand: ["default_payment_method"] }
        );

        // Check if subscription has a default payment method
        if (subscription.default_payment_method) {
          const paymentMethodId =
            typeof subscription.default_payment_method === "string"
              ? subscription.default_payment_method
              : subscription.default_payment_method.id;

          const paymentMethod = await retrievePaymentMethodById(paymentMethodId);
          if (paymentMethod) {
            return paymentMethod;
          }
        }
      } catch (subError: any) {
        // Subscription might not exist or be accessible, but don't fail the whole request
        if (subError?.code !== "resource_missing") {
          console.error("Error retrieving subscription for payment method:", subError);
        }
        // Continue to return null below
      }
    }

    return null;
  } catch (error: any) {
    // Handle specific Stripe errors
    if (error?.code === "resource_missing") {
      // Customer doesn't exist
      return null;
    }
    console.error("Error fetching payment method:", error);
    throw error; // Re-throw to let API route handle it
  }
}

/**
 * Find the active subscription ID for a customer
 * Returns the ID of the first active or trialing subscription found
 */
export async function findActiveSubscriptionId(
  customerId: string
): Promise<string | null> {
  try {
    const subscriptions = await getStripeClient().subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100, // Reasonable limit
    });

    const activeSub = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    return activeSub ? activeSub.id : null;
  } catch (error) {
    console.error("Error finding active subscription:", error);
    return null;
  }
}

/**
 * Get invoices for a Stripe customer
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10,
  subscriptionId?: string
): Promise<InvoiceInfo[]> {
  try {
    const listParams: Stripe.InvoiceListParams = {
      customer: customerId,
      limit,
    };

    if (subscriptionId) {
      listParams.subscription = subscriptionId;
    }

    const invoices = await getStripeClient().invoices.list(listParams);

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status || "draft",
      created: invoice.created,
      invoicePdf: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    }));
  } catch (error: any) {
    // Handle specific Stripe errors
    if (error?.code === "resource_missing") {
      // Customer doesn't exist
      return [];
    }
    console.error("Error fetching invoices:", error);
    throw error; // Re-throw to let API route handle it
  }
}

