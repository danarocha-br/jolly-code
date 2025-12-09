import Stripe from 'stripe';
import type { PlanId } from '@/lib/config/plans';

// Initialize Stripe with the secret key (allow builds without it)
// Note: API version '2025-11-17.clover' is required for Stripe v20.0.0+
// This codebase is compatible with Stripe v20.0.0 breaking changes:
// - API version is correctly pinned
// - No usage of EventListParams (gt/gte/lt/lte removed - use 'created' instead)
// - No tests using v2 array parameter serialization that would be affected
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
  });
};

// Lazy initialization
let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance, initializing it on first call
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = getStripeInstance();
  }
  return stripeInstance;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string;
}): Promise<Stripe.Customer> {
  // First, search for existing customer by metadata.userId (most reliable)
  const customersByMetadata = await getStripeClient().customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });

  if (customersByMetadata.data.length > 0) {
    const customer = customersByMetadata.data[0];
    // Verify customer is not deleted
    if (!customer.deleted) {
      return customer;
    }
  }

  // Fallback to email-based lookup
  const customersByEmail = await getStripeClient().customers.list({
    email,
    limit: 1,
  });

  if (customersByEmail.data.length > 0) {
    const customer = customersByEmail.data[0];
    // Verify customer is not deleted and belongs to our app
    if (!customer.deleted && customer.metadata?.userId === userId) {
      return customer;
    }
  }

  // Create new customer if none found
  const customer = await getStripeClient().customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Get Stripe price ID for a plan and billing interval
 */
export function getStripePriceId(plan: PlanId, interval: 'monthly' | 'yearly'): string {
  const envVarMap = {
    started: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
    },
    pro: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    },
  };

  if (plan === 'free') {
    throw new Error('Free plan does not have a Stripe price ID');
  }

  const priceId = envVarMap[plan][interval];

  if (!priceId) {
    throw new Error(`Stripe price ID not found for plan: ${plan}, interval: ${interval}`);
  }

  return priceId;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const session = await getStripeClient().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    subscription_data: {
      metadata,
    },
  });

  return session;
}

/**
 * Create a customer portal session for managing subscriptions
 */
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await getStripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await getStripeClient().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a subscription that was set to cancel
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await getStripeClient().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await getStripeClient().subscriptions.retrieve(subscriptionId);
}

/**
 * Update subscription to a different price
 */
export async function updateSubscriptionPrice({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string;
  newPriceId: string;
}): Promise<Stripe.Subscription> {
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);

  // Defensively validate subscription items
  if (!subscription.items?.data || subscription.items.data.length === 0) {
    throw new Error(
      `Subscription ${subscriptionId} has no items. Cannot update price.`
    );
  }

  // If multiple items exist, update all of them to the new price
  // (typically subscriptions have one item, but handle multiple for safety)
  const itemsToUpdate = subscription.items.data.map((item) => ({
    id: item.id,
    price: newPriceId,
  }));

  return await getStripeClient().subscriptions.update(subscriptionId, {
    items: itemsToUpdate,
    proration_behavior: 'create_prorations',
  });
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}
