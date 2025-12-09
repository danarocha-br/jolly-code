import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getStripeClient } from "./stripe";

type Supabase = SupabaseClient<Database>;

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
 * Returns true for 'active' or 'trialing' statuses
 */
export function hasActiveSubscription(billingInfo: BillingInfo | null | undefined): boolean {
  if (!billingInfo?.stripeSubscriptionStatus) {
    return false;
  }
  const status = billingInfo.stripeSubscriptionStatus;
  return status === "active" || status === "trialing";
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

  // Use billing interval from database if available, otherwise fetch from Stripe
  let billingInterval: "monthly" | "yearly" | null = (data.billing_interval as "monthly" | "yearly" | null) || null;
  
  // Fallback to Stripe API if not in database (for backward compatibility)
  if (!billingInterval && data.stripe_subscription_id) {
    try {
      const subscription = await getStripeClient().subscriptions.retrieve(
        data.stripe_subscription_id
      );
      const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
      if (priceInterval === "month" || priceInterval === "year") {
        billingInterval = priceInterval === "month" ? "monthly" : "yearly";
      }
    } catch (error) {
      // If Stripe API call fails, log but don't fail the entire request
      console.error("Failed to fetch subscription interval from Stripe:", error);
    }
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
 * Get payment method from Stripe customer
 */
export async function getPaymentMethod(
  customerId: string
): Promise<PaymentMethodInfo | null> {
  try {
    const customer = await getStripeClient().customers.retrieve(customerId);

    if (customer.deleted || typeof customer === "string") {
      return null;
    }

    // Get default payment method
    if (customer.invoice_settings?.default_payment_method) {
      const paymentMethodId =
        typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method.id;

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
      } catch (pmError: any) {
        // Payment method might not exist or be accessible
        if (pmError?.code !== "resource_missing") {
          console.error("Error retrieving payment method:", pmError);
        }
        return null;
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
 * Get invoices for a Stripe customer
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<InvoiceInfo[]> {
  try {
    const invoices = await getStripeClient().invoices.list({
      customer: customerId,
      limit,
    });

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

