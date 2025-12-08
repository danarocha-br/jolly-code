import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { constructWebhookEvent } from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import type { Json } from '@/types/database';
import Stripe from 'stripe';
import { enforceRateLimit, webhookLimiter } from '@/lib/arcjet/limiters';

export const dynamic = 'force-dynamic';
type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

// Map Stripe price IDs to plan IDs
function getPlanIdFromPriceId(priceId: string): PlanId | null {
  const priceIdMap: Record<string, PlanId> = {
    [process.env.NEXT_PUBLIC_STRIPE_STARTED_MONTHLY_PRICE_ID || '']: 'started',
    [process.env.NEXT_PUBLIC_STRIPE_STARTED_YEARLY_PRICE_ID || '']: 'started',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '']: 'pro',
  };

  return priceIdMap[priceId] || null;
}

function resolvePlan(subscription: Stripe.Subscription): PlanId | null {
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === 'started' || metadataPlan === 'pro') {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;

  return getPlanIdFromPriceId(priceId);
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

async function upsertWebhookAudit(
  supabase: ServiceRoleClient,
  event: Stripe.Event,
  {
    status,
    errorMessage,
    userId,
  }: { status: string; errorMessage?: string; userId?: string | null }
) {
  const stripeObject = event.data?.object as
    | Stripe.Subscription
    | Stripe.Invoice
    | Stripe.Checkout.Session
    | undefined;

  const stripeCustomerId = stripeObject ? getStripeCustomerId(stripeObject) : null;
  const payload = JSON.parse(JSON.stringify(event)) as Json;

  const { error } = await supabase.from('stripe_webhook_audit').upsert(
    {
      event_id: event.id,
      event_type: event.type,
      payload,
      status,
      error_message: errorMessage ?? null,
      stripe_customer_id: stripeCustomerId,
      user_id: userId ?? null,
    },
    { onConflict: 'event_id' }
  );

  if (error) {
    console.error('Failed to log Stripe webhook audit event', error);
  }
}

// Handle subscription created or updated
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  supabase: ServiceRoleClient
) {
  const userId = await resolveUserIdFromSubscription(subscription, supabase);
  if (!userId) {
    throw new Error('No user found for subscription (missing metadata and lookup failed)');
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planId = resolvePlan(subscription);
  if (!planId) {
    throw new Error('Could not determine plan from subscription metadata/price');
  }

  const updateData: any = {
    plan: planId,
    plan_updated_at: new Date().toISOString(),
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    subscription_cancel_at_period_end: (subscription as any).cancel_at_period_end,
    stripe_price_id: priceId,
  };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    throw error;
  }

  // Reconcile over-limit flags when plan changes (upgrades or downgrades)
  const { error: reconcileError } = await (supabase as any).rpc('reconcile_over_limit_content', {
    p_user_id: userId,
  });

  if (reconcileError) {
    console.error('Failed to reconcile over-limit content', reconcileError);
  }

  console.log(`Updated user ${userId} to plan ${planId}`);
  return userId;
}

// Handle subscription deleted (downgrade to free)
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ServiceRoleClient
) {
  const userId = await resolveUserIdFromSubscription(subscription, supabase);
  if (!userId) {
    throw new Error('No user found for subscription deletion (missing metadata and lookup failed)');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      plan_updated_at: new Date().toISOString(),
      stripe_subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  const { error: reconcileError } = await (supabase as any).rpc('reconcile_over_limit_content', {
    p_user_id: userId,
  });

  if (reconcileError) {
    console.error('Failed to reconcile over-limit content after cancellation', reconcileError);
  }

  console.log(`Downgraded user ${userId} to free plan`);
  return userId;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const limitResponse = await enforceRateLimit(webhookLimiter, request, {
    tags: ["webhook:stripe"],
  });
  if (limitResponse) return limitResponse;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const supabase = createServiceRoleClient();
  let event: Stripe.Event | null = null;
  let resolvedUserId: string | null = null;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    event = constructWebhookEvent(body, signature, webhookSecret);

    console.log('Received Stripe webhook:', event.type);
    await upsertWebhookAudit(supabase, event, { status: 'received' });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        resolvedUserId = await handleSubscriptionChange(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'customer.subscription.deleted':
        resolvedUserId = await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'checkout.session.completed':
        // Session completed, subscription webhook will handle the plan update
        console.log('Checkout session completed:', event.data.object.id);
        break;

      case 'invoice.payment_succeeded':
        // Payment succeeded, log for tracking
        console.log('Invoice payment succeeded:', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        // Payment failed, could send notification to user
        console.log('Invoice payment failed:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await upsertWebhookAudit(supabase, event, { status: 'processed', userId: resolvedUserId });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    Sentry.captureException(error, {
      extra: {
        source: 'stripe-webhook',
        eventType: event?.type,
        eventId: event?.id,
      },
    });

    if (event) {
      await upsertWebhookAudit(supabase, event, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown webhook error',
        userId: resolvedUserId,
      });
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
