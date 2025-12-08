import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { constructWebhookEvent } from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

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

// Handle subscription created or updated
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planId = resolvePlan(subscription);
  if (!planId) {
    console.error('Could not determine plan from subscription metadata/price');
    return;
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
    console.error('Error updating profile:', error);
    throw error;
  }

  console.log(`Updated user ${userId} to plan ${planId}`);
}

// Handle subscription deleted (downgrade to free)
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
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
    console.error('Error downgrading user to free:', error);
    throw error;
  }

  console.log(`Downgraded user ${userId} to free plan`);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

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
    const event = constructWebhookEvent(body, signature, webhookSecret);

    console.log('Received Stripe webhook:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    
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
