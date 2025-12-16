import { createServiceRoleClient } from '@/utils/supabase/admin';
import type { PlanId } from '@/lib/config/plans';
import type Stripe from 'stripe';

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Get Stripe customer ID from various Stripe objects
 */
export function getStripeCustomerId(
  stripeObject: Stripe.Subscription | Stripe.Invoice | Stripe.Checkout.Session
): string | null {
  const customer = (stripeObject as { customer?: string | Stripe.Customer | null }).customer;
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * Resolve user ID from a Stripe subscription
 */
export async function resolveUserIdFromSubscription(
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

/**
 * Get price ID to plan ID mapping
 */
export function getPriceIdMap(): Record<string, PlanId> {
  const priceIdMap: Record<string, PlanId> = {};

  const startedMonthly = process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID?.trim();
  const startedYearly = process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID?.trim();
  const proMonthly = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
  const proYearly = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID?.trim();

  if (startedMonthly) priceIdMap[startedMonthly] = 'starter';
  if (startedYearly) priceIdMap[startedYearly] = 'starter';
  if (proMonthly) priceIdMap[proMonthly] = 'pro';
  if (proYearly) priceIdMap[proYearly] = 'pro';

  return priceIdMap;
}

/**
 * Map Stripe price ID to plan ID
 */
export function getPlanIdFromPriceId(priceId: string): PlanId | null {
  const priceIdMap = getPriceIdMap();
  return priceIdMap[priceId] || null;
}
