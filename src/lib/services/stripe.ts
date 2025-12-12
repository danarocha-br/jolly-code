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
    if (!customer.deleted) {
      // If customer exists but has no/different userId metadata, update it
      if (!customer.metadata?.userId) {
        return await getStripeClient().customers.update(customer.id, {
          metadata: { userId },
        });
      }
      if (customer.metadata.userId === userId) {
        return customer;
      }
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
 * Validates that the price ID exists and is not empty before returning it.
 * Throws a clear error if the configuration is missing.
 */
export function getStripePriceId(plan: PlanId, interval: 'monthly' | 'yearly'): string {
  const envVarMap = {
    started: {
      monthly: {
        value: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID,
        envVar: 'NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID',
      },
      yearly: {
        value: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
        envVar: 'NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID',
      },
    },
    pro: {
      monthly: {
        value: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
        envVar: 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID',
      },
      yearly: {
        value: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
        envVar: 'NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID',
      },
    },
  };

  if (plan === 'free') {
    throw new Error('Free plan does not have a Stripe price ID');
  }

  const priceConfig = envVarMap[plan][interval];
  const priceId = priceConfig.value;

  if (!priceId || priceId.trim() === '') {
    throw new Error(
      `Stripe price ID configuration is missing or empty for plan "${plan}" (${interval} billing). ` +
      `Please ensure ${priceConfig.envVar} is set in your environment variables. ` +
      `This is required for checkout to work properly.`
    );
  }

  return priceId;
}

/**
 * Create a Stripe checkout session
 * Validates the price ID before creating the session to provide clear errors.
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
  // Validate price ID before calling Stripe API
  if (!priceId || priceId.trim() === '') {
    throw new Error(
      'Invalid Stripe price ID: price ID is missing or empty. ' +
      'Please ensure all required NEXT_PUBLIC_STRIPE_*_PRICE_ID environment variables are configured.'
    );
  }

  // Basic validation: Stripe price IDs typically start with 'price_'
  if (!priceId.startsWith('price_')) {
    throw new Error(
      `Invalid Stripe price ID format: "${priceId}". ` +
      'Stripe price IDs should start with "price_". ' +
      'Please verify your NEXT_PUBLIC_STRIPE_*_PRICE_ID environment variables are correct.'
    );
  }

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
  flow_data,
}: {
  customerId: string;
  returnUrl: string;
  flow_data?: Stripe.BillingPortal.SessionCreateParams.FlowData;
}): Promise<Stripe.BillingPortal.Session> {
  const params: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: returnUrl,
  };

  if (flow_data) {
    params.flow_data = flow_data;
  }

  const session = await getStripeClient().billingPortal.sessions.create(params);

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
