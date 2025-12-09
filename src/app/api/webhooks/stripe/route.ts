import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { constructWebhookEvent, getStripeClient } from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import type { Json } from '@/types/database';
import Stripe from 'stripe';
import { captureServerEvent } from '@/lib/services/tracking/server';

export const dynamic = 'force-dynamic';
type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

// Map Stripe price IDs to plan IDs
function getPlanIdFromPriceId(priceId: string): PlanId | null {
  // Build map only from non-empty environment variables to prevent collisions
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

async function resolveUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
  supabase: ServiceRoleClient
): Promise<string | null> {
  // Try metadata first (most reliable)
  if (session.metadata?.userId) {
    return session.metadata.userId;
  }

  // Try customer lookup
  const customerId = getStripeCustomerId(session);
  if (customerId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve user by stripe_customer_id: ${error.message}`);
    }

    if (data?.id) {
      return data.id;
    }
  }

  // Try email lookup as fallback
  if (session.customer_email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', session.customer_email)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve user by email: ${error.message}`);
    }

    return data?.id ?? null;
  }

  return null;
}

async function resolveUserIdFromInvoice(
  invoice: Stripe.Invoice,
  supabase: ServiceRoleClient
): Promise<string | null> {
  const customerId = getStripeCustomerId(invoice);
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
 * Send payment failed notification email to user
 * TODO: Integrate with email service (Resend, SendGrid, etc.)
 */
async function sendPaymentFailedEmail(
  userId: string,
  email: string,
  invoiceId: string,
  amount: number,
  currency: string
): Promise<void> {
  // Placeholder implementation - log for now
  // In production, integrate with your email service
  console.log(`[Email] Payment failed notification for user ${userId}`, {
    email,
    invoiceId,
    amount,
    currency,
  });

  // TODO: Implement actual email sending
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'noreply@yourapp.com',
  //   to: email,
  //   subject: 'Payment Failed - Action Required',
  //   html: `...`
  // });
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

  const customerId = getStripeCustomerId(subscription);
  if (!customerId) {
    throw new Error('Subscription has no customer ID');
  }

  // Extract billing interval from Stripe subscription
  const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
  const billingInterval = priceInterval === "month" ? "monthly" : priceInterval === "year" ? "yearly" : null;

  // Safely convert current_period_end from Unix timestamp (seconds) to ISO string
  const subscriptionPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const updateData: {
    plan: PlanId;
    plan_updated_at: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    stripe_subscription_status: Stripe.Subscription.Status;
    subscription_period_end: string | null;
    subscription_cancel_at_period_end: boolean | null;
    stripe_price_id: string | undefined;
    billing_interval: string | null;
  } = {
    plan: planId,
    plan_updated_at: new Date().toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_period_end: subscriptionPeriodEnd,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? null,
    stripe_price_id: priceId,
    billing_interval: billingInterval,
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
    Sentry.captureException(reconcileError, {
      extra: { userId, operation: 'reconcile_over_limit_content' },
    });
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
      billing_interval: null,
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
    Sentry.captureException(reconcileError, {
      level: 'error',
      tags: {
        action: 'reconcile_over_limit_content',
      },
      extra: { userId },
    });
  }

  console.log(`Downgraded user ${userId} to free plan`);
  return userId;
}

// Handle checkout session completed
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: ServiceRoleClient
): Promise<string | null> {
  try {
    // Fetch full session if subscription is not expanded
    let fullSession = session;
    if (!session.subscription && session.id) {
      fullSession = await getStripeClient().checkout.sessions.retrieve(session.id, {
        expand: ['subscription'],
      });
    }

    const userId = await resolveUserIdFromCheckoutSession(fullSession, supabase);
    if (!userId) {
      console.warn('Could not resolve user from checkout session:', session.id);
      return null;
    }

    // If subscription exists, ensure it's linked to the user profile
    const subscriptionId =
      typeof fullSession.subscription === 'string'
        ? fullSession.subscription
        : fullSession.subscription?.id;

    if (subscriptionId) {
      // Verify subscription is linked (subscription webhook will handle plan update)
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_subscription_id, stripe_customer_id')
        .eq('id', userId)
        .single();

      const customerId = getStripeCustomerId(fullSession);
      if (customerId && !profile?.stripe_customer_id) {
        // Ensure customer ID is set
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }
    }

    // Track checkout completion event
    await captureServerEvent('checkout_session_completed', {
      distinctId: userId,
      properties: {
        session_id: fullSession.id,
        subscription_id: subscriptionId,
        plan: fullSession.metadata?.plan,
        interval: fullSession.metadata?.interval,
      },
    });

    console.log(`Checkout session completed for user ${userId}:`, fullSession.id);
    return userId;
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    Sentry.captureException(error, {
      extra: {
        sessionId: session.id,
        operation: 'handleCheckoutSessionCompleted',
      },
    });
    throw error;
  }
}

// Handle invoice payment succeeded
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: ServiceRoleClient
): Promise<string | null> {
  try {
    const userId = await resolveUserIdFromInvoice(invoice, supabase);
    if (!userId) {
      console.warn('Could not resolve user from invoice:', invoice.id);
      return null;
    }

    // Clear any past_due status by updating subscription status to active
    const invoiceSubscription = (invoice as any).subscription;
    if (invoiceSubscription && typeof invoiceSubscription === 'string') {
      const subscriptionId = invoiceSubscription;
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_subscription_status')
        .eq('id', userId)
        .single();

      // If subscription was past_due, update to active
      if (profile?.stripe_subscription_status === 'past_due') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_subscription_status: 'active' })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update subscription status after payment:', updateError);
          Sentry.captureException(updateError, {
            extra: { userId, invoiceId: invoice.id },
          });
        } else {
          console.log(`Cleared past_due status for user ${userId} after successful payment`);
        }
      }
    }

    // Record payment in audit log (payment details are in webhook audit payload)
    // Track payment success event
    await captureServerEvent('invoice_payment_succeeded', {
      distinctId: userId,
      properties: {
        invoice_id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        subscription_id:
          typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : (invoiceSubscription as Stripe.Subscription)?.id,
      },
    });

    console.log(`Invoice payment succeeded for user ${userId}:`, invoice.id);
    return userId;
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    Sentry.captureException(error, {
      extra: {
        invoiceId: invoice.id,
        operation: 'handleInvoicePaymentSucceeded',
      },
    });
    throw error;
  }
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ServiceRoleClient
): Promise<string | null> {
  try {
    const userId = await resolveUserIdFromInvoice(invoice, supabase);
    if (!userId) {
      console.warn('Could not resolve user from invoice:', invoice.id);
      return null;
    }

    // Mark subscription as past_due or unpaid
    const invoiceSubscription = (invoice as any).subscription;
    if (invoiceSubscription && typeof invoiceSubscription === 'string') {
      const subscriptionId = invoiceSubscription;

      // Fetch subscription to get current status
      let subscription: Stripe.Subscription;
      try {
        subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        throw error;
      }

      // Update subscription status based on Stripe's status
      const statusToSet =
        subscription.status === 'past_due' ? 'past_due' : subscription.status || 'past_due';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_subscription_status: statusToSet })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update subscription status after payment failure:', updateError);
        Sentry.captureException(updateError, {
          extra: { userId, invoiceId: invoice.id },
        });
      } else {
        console.log(`Updated subscription status to ${statusToSet} for user ${userId}`);
      }
    }

    // Get user email for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email || invoice.customer_email || null;

    // Send notification email
    if (userEmail) {
      try {
        await sendPaymentFailedEmail(
          userId,
          userEmail,
          invoice.id,
          invoice.amount_due,
          invoice.currency
        );
      } catch (emailError) {
        console.error('Failed to send payment failed email:', emailError);
        Sentry.captureException(emailError, {
          extra: { userId, invoiceId: invoice.id },
        });
        // Don't throw - email failure shouldn't fail the webhook
      }
    }

    // Track payment failure event
    await captureServerEvent('invoice_payment_failed', {
      distinctId: userId,
      properties: {
        invoice_id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        subscription_id:
          typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : (invoiceSubscription as Stripe.Subscription)?.id,
        attempt_count: invoice.attempt_count,
      },
    });

    console.log(`Invoice payment failed for user ${userId}:`, invoice.id);
    return userId;
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    Sentry.captureException(error, {
      extra: {
        invoiceId: invoice.id,
        operation: 'handleInvoicePaymentFailed',
      },
    });
    throw error;
  }
}

/**
 * Determines the appropriate HTTP status code for webhook errors.
 * - 400: Client/validation errors (invalid signature, malformed payload) - don't retry
 * - 500: Transient/internal errors (DB connectivity/timeouts) - retry
 * - 200: Permanent/unrecoverable errors (user not found) - acknowledge, don't retry
 */
function getErrorStatusCode(error: unknown): number {
  if (!error) {
    return 500;
  }

  const errorObj = error as Record<string, unknown>;
  const errorMessage = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : '';
  const errorName = typeof errorObj.name === 'string' ? errorObj.name.toLowerCase() : '';
  const errorType = typeof errorObj.type === 'string' ? errorObj.type.toLowerCase() : '';
  const errorCode = errorObj.code;

  // Stripe signature verification errors (400 - client error, don't retry)
  if (
    errorType.includes('signature') ||
    errorName.includes('signature') ||
    errorMessage.includes('signature') ||
    errorMessage.includes('invalid signature') ||
    errorMessage.includes('no signatures found')
  ) {
    return 400;
  }

  // Malformed payload errors (400 - client error, don't retry)
  if (
    errorMessage.includes('malformed') ||
    errorMessage.includes('invalid json') ||
    errorMessage.includes('parse error') ||
    errorMessage.includes('unexpected token')
  ) {
    return 400;
  }

  // Database connectivity/timeout errors (500 - transient, retry)
  if (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNRESET' ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connectivity') ||
    errorMessage.includes('database unavailable')
  ) {
    return 500;
  }

  // Supabase/PostgreSQL connection errors (500 - transient, retry)
  if (
    errorCode === 'PGRST301' || // Connection error
    errorMessage.includes('connection to server') ||
    errorMessage.includes('could not connect') ||
    errorMessage.includes('connection pool')
  ) {
    return 500;
  }

  // Permanent/unrecoverable errors (200 - acknowledge, don't retry)
  if (
    errorMessage.includes('no user found') ||
    errorMessage.includes('user not found') ||
    errorMessage.includes('missing metadata and lookup failed') ||
    errorMessage.includes('could not determine plan') ||
    errorMessage.includes('subscription has no customer id')
  ) {
    return 200;
  }

  // Supabase errors that are typically permanent (200 - acknowledge, don't retry)
  if (
    errorCode === 'PGRST116' || // No rows returned
    errorCode === '23505' || // Unique constraint violation (already processed)
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('already exists')
  ) {
    return 200;
  }

  // Default to 500 for unknown errors (transient, retry)
  return 500;
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

    // Check if we've already processed this event (idempotency check)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_audit')
      .select('status')
      .eq('event_id', event.id)
      .maybeSingle();

    // If event was already successfully processed, return 200 OK to prevent Stripe retries
    if (existingEvent?.status === 'processed') {
      console.log(`Event ${event.id} already processed, returning success`);
      return NextResponse.json({ received: true, message: 'Event already processed' });
    }

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
        resolvedUserId = await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        );
        break;

      case 'invoice.payment_succeeded':
        resolvedUserId = await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      case 'invoice.payment_failed':
        resolvedUserId = await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await upsertWebhookAudit(supabase, event, { status: 'processed', userId: resolvedUserId });

    return NextResponse.json({ received: true });
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    const errorDetails = {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as Record<string, unknown>)?.code,
      type: (error as Record<string, unknown>)?.type,
    };

    console.error('Webhook error:', {
      ...errorDetails,
      statusCode,
      eventType: event?.type,
      eventId: event?.id,
    });

    Sentry.captureException(error, {
      extra: {
        source: 'stripe-webhook',
        eventType: event?.type,
        eventId: event?.id,
        statusCode,
        ...errorDetails,
      },
    });

    if (event) {
      await upsertWebhookAudit(supabase, event, {
        status: 'failed',
        errorMessage: errorMessage,
        userId: resolvedUserId,
      });
    }

    // Return appropriate status code based on error type
    // 200 for permanent errors (acknowledge receipt, don't retry)
    if (statusCode === 200) {
      console.log('Permanent error - acknowledging receipt to prevent retries:', errorMessage);
      return NextResponse.json(
        { received: true, error: errorMessage },
        { status: 200 }
      );
    }

    // 400 for client/validation errors (don't retry)
    if (statusCode === 400) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // 500 for transient/internal errors (retry)
    return NextResponse.json(
      { error: errorMessage || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
