import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import React from 'react';

import { createServiceRoleClient } from '@/utils/supabase/admin';
import { constructWebhookEvent, getStripeClient } from '@/lib/services/stripe';
import type { PlanId } from '@/lib/config/plans';
import type { Json } from '@/types/database';
import { captureServerEvent } from '@/lib/services/tracking/server';
import { invalidateUserUsageCache } from '@/lib/services/usage-limits-cache';
import { syncSubscriptionToDatabase } from '@/lib/services/subscription-sync';
import { getPlanIdFromPriceId, getStripeCustomerId, resolveUserIdFromSubscription } from '@/lib/services/stripe-helpers';
import { sendEmail } from '@/lib/email/send-email';
import WelcomeEmail from '@emails/welcome-email';

export const dynamic = 'force-dynamic';
type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;


function resolvePlan(subscription: Stripe.Subscription): PlanId | null {
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === 'starter' || metadataPlan === 'started' || metadataPlan === 'pro') {
    return metadataPlan === 'started' ? 'starter' : (metadataPlan as PlanId);
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;

  const planFromPrice = getPlanIdFromPriceId(priceId);
  return planFromPrice;
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
  const email = session.customer_email || session.customer_details?.email;
  if (email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve user by email: ${error.message}`);
    }

    if (data?.id) {
      return data?.id;
    }
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
 * Log payment failed event for tracking/analytics
 * 
 * Note: Payment failed emails are handled automatically by Stripe.
 * Configure in Stripe Dashboard: Settings > Billing > Subscriptions and emails
 * Enable "Send emails when card payments fail"
 * 
 * This function is kept for logging/tracking purposes only.
 */
async function sendPaymentFailedEmail(
  userId: string,
  email: string,
  invoiceId: string,
  amount: number,
  currency: string
): Promise<void> {
  // Log payment failure for analytics/tracking
  // Stripe automatically sends payment failed emails to customers
  console.log(`[Payment Failed] User ${userId} - Invoice ${invoiceId}`, {
    email,
    amount,
    currency,
    note: 'Stripe handles payment failed email notifications automatically',
  });
}

/**
 * Attempt to resolve user ID from a Stripe customer ID
 */
async function resolveUserIdFromCustomerId(
  customerId: string | null,
  supabase: ServiceRoleClient
): Promise<string | null> {
  if (!customerId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.warn(`[resolveUserIdFromCustomerId] Failed to lookup user for customer ${customerId}:`, error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn(`[resolveUserIdFromCustomerId] Error looking up user for customer ${customerId}:`, error);
    return null;
  }
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
  // Try to extract customer ID from any Stripe event object
  const stripeObject = event.data?.object as unknown as Record<string, unknown>;
  const stripeCustomerId = stripeObject ? getStripeCustomerId(stripeObject) : null;
  
  // If we have a customer ID but no user ID, try to resolve it
  let resolvedUserId = userId;
  if (!resolvedUserId && stripeCustomerId) {
    resolvedUserId = await resolveUserIdFromCustomerId(stripeCustomerId, supabase);
  }
  
  // Verify user still exists before inserting (user might have been deleted)
  // This prevents foreign key constraint violations when webhooks arrive after account deletion
  let finalUserId: string | null = resolvedUserId ?? null;
  if (finalUserId) {
    try {
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', finalUserId)
        .maybeSingle();
      
      if (!profileCheck) {
        // User no longer exists (likely deleted), set to null
        console.warn(`[upsertWebhookAudit] User ${finalUserId} no longer exists, setting user_id to null for event ${event.id}`);
        finalUserId = null;
      }
    } catch (verifyError) {
      // If verification fails, set to null to avoid foreign key constraint violation
      console.warn(`[upsertWebhookAudit] Failed to verify user ${finalUserId}, setting user_id to null:`, verifyError);
      finalUserId = null;
    }
  }
  
  const payload = JSON.parse(JSON.stringify(event)) as Json;

  const { error } = await supabase.from('stripe_webhook_audit').upsert(
    {
      event_id: event.id,
      event_type: event.type,
      payload,
      status,
      error_message: errorMessage ?? null,
      stripe_customer_id: stripeCustomerId,
      user_id: finalUserId,
    },
    { onConflict: 'event_id' }
  );

  if (error) {
    console.error('Failed to log Stripe webhook audit event', error);
    // If it's a foreign key constraint error, try again with user_id set to null
    if (error.code === '23503' && finalUserId) {
      console.warn(`[upsertWebhookAudit] Retrying with user_id=null due to foreign key constraint violation for event ${event.id}`);
      const { error: retryError } = await supabase.from('stripe_webhook_audit').upsert(
        {
          event_id: event.id,
          event_type: event.type,
          payload,
          status,
          error_message: errorMessage ?? null,
          stripe_customer_id: stripeCustomerId,
          user_id: null,
        },
        { onConflict: 'event_id' }
      );
      if (retryError) {
        console.error('Failed to log Stripe webhook audit event (retry with null user_id):', retryError);
      }
    }
  }
}

// Handle subscription created or updated
async function handleSubscriptionChange(
  event: Stripe.Event,
  supabase: ServiceRoleClient
) {
  // Retrieve the latest subscription state from Stripe to ensure we have the most up-to-date data
  // This prevents race conditions or stale data issues from the webhook payload
  // Expand latest_invoice to get period_start and period_end as fallback if subscription fields are missing
  const stripeSubscription = event.data.object as Stripe.Subscription;
  const subscription = await getStripeClient().subscriptions.retrieve(stripeSubscription.id, {
    expand: ['items.data.price', 'latest_invoice'],
  });

  // For customer.subscription.created, check if user had existing subscription BEFORE syncing
  // This determines if we should send welcome email
  let shouldSendWelcomeEmail = false;
  let userEmail: string | null = null;
  let userName: string | undefined = undefined;
  
  if (event.type === 'customer.subscription.created') {
    try {
      // Get userId first (before syncing)
      const userId = await resolveUserIdFromSubscription(subscription, supabase);
      if (userId) {
        
        // Check if user already had a subscription BEFORE we sync
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_subscription_id, email, username')
          .eq('id', userId)
          .single();

        // If user had no subscription ID or it's different, this is a new subscription
        const hadExistingSubscription = !!profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id;
        shouldSendWelcomeEmail = !hadExistingSubscription && !!profile?.email;
        userEmail = profile?.email || null;
        userName = profile?.username || undefined;
        
      }
    } catch (error) {
      console.error('Error checking for welcome email in subscription.created:', error);
    }
  }

  const result = await syncSubscriptionToDatabase(subscription);

  if (!result) {
    throw new Error('Failed to sync subscription to database');
  }

  // Send welcome email for NEW subscriptions (customer.subscription.created only)
  if (event.type === 'customer.subscription.created' && shouldSendWelcomeEmail && userEmail) {
    try {
      console.log(`[Welcome Email] Sending to ${userEmail} for user ${result.userId}`);
      await sendEmail({
        to: userEmail,
        subject: 'Welcome to Jolly Code!',
        react: React.createElement(WelcomeEmail, { name: userName }),
        idempotencyKey: `welcome-email-${result.userId}-${subscription.id}`,
      });
      console.log(`[Welcome Email] Sent successfully to user ${result.userId}`);
    } catch (emailError) {
      // Don't fail webhook if email fails - log and continue
      console.error('[Welcome Email] Failed to send:', emailError);
      Sentry.captureException(emailError, {
        level: 'warning',
        tags: {
          operation: 'send_welcome_email_subscription_created',
        },
        extra: {
          userId: result.userId,
          subscriptionId: subscription.id,
          userEmail: userEmail,
        },
      });
    }
  }

  // Invalidate usage cache
  try {
    invalidateUserUsageCache(result.userId);
  } catch (error) {
    console.error('Failed to invalidate usage cache in webhook:', error);
  }

  return result.userId;
}

// Handle subscription deleted (downgrade to free)
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ServiceRoleClient
): Promise<string | null> {
  const userId = await resolveUserIdFromSubscription(subscription, supabase);
  if (!userId) {
    // User might have been deleted - this is okay, just log and return null
    console.warn('[handleSubscriptionDeleted] No user found for subscription deletion - user may have been deleted');
    return null;
  }

  // Verify user still exists before trying to update
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profileCheck) {
    // User no longer exists (likely deleted) - this is okay, just log and return null
    console.warn(`[handleSubscriptionDeleted] User ${userId} no longer exists - account may have been deleted`);
    return null;
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
    // If user was deleted between check and update, that's okay
    if (error.code === 'PGRST116') {
      console.warn(`[handleSubscriptionDeleted] User ${userId} was deleted during update - this is expected`);
      return null;
    }
    throw error;
  }

  // Only reconcile if user still exists (user might have been deleted)
  const { error: reconcileError } = await (supabase as any).rpc('reconcile_over_limit_content', {
    p_user_id: userId,
  });

  if (reconcileError) {
    // If user was deleted, this is expected - don't log as error
    if (reconcileError.message?.includes('User not found') || reconcileError.code === 'P0001') {
      console.warn(`[handleSubscriptionDeleted] User ${userId} not found for reconciliation - account may have been deleted`);
    } else {
      console.error('Failed to reconcile over-limit content after cancellation', reconcileError);
      Sentry.captureException(reconcileError, {
        level: 'error',
        tags: {
          action: 'reconcile_over_limit_content',
        },
        extra: { userId },
      });
    }
  }

  console.log(`Downgraded user ${userId} to free plan`);

  // Invalidate usage cache
  try {
    invalidateUserUsageCache(userId);
  } catch (error) {
    console.error('Failed to invalidate usage cache in webhook (downgrade):', error);
  }

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
    
    // Get user profile to check email and existing subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id, email, username')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`[handleCheckoutSessionCompleted] Failed to load profile for user ${userId}:`, profileError);
      throw new Error(`Failed to load user profile: ${profileError.message}`);
    }

    if (!profile) {
      console.error(`[handleCheckoutSessionCompleted] Profile not found for user ${userId}`);
      throw new Error(`User profile not found for userId: ${userId}`);
    }

    let hadExistingSubscription = false;
    if (subscriptionId) {
      // Verify subscription is linked (subscription webhook will handle plan update)
      // Profile already loaded above

      // Check if user already had a subscription BEFORE this checkout
      // Important: We need to check if the subscription existed BEFORE this checkout session
      // The subscription.created webhook might have already run and set stripe_subscription_id,
      // so we check if the existing subscription_id matches the new one from checkout.
      // If they match, it means this is the NEW subscription (not an existing one).
      const existingSubscriptionId = profile?.stripe_subscription_id;
      
      // If existing subscription ID is different from the new one, user had a previous subscription
      // If they match (or existing is null), this is a new subscription
      hadExistingSubscription = !!existingSubscriptionId && existingSubscriptionId !== subscriptionId;

      const customerId = getStripeCustomerId(fullSession);
      if (customerId && !profile?.stripe_customer_id) {
        // Ensure customer ID is set
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }

      // NOTE: Welcome email is sent by customer.subscription.created webhook handler
      // We don't send it here to avoid duplicates, since both events fire for new subscriptions
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
    if (typeof invoiceSubscription === 'string') {
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
    console.log('[Webhook] Verifying webhook signature...');
    event = constructWebhookEvent(body, signature, webhookSecret);
    console.log('[Webhook] Event verified:', event.type, event.id);



    // Check if we've already processed this event (idempotency check)
    console.log('[Webhook] Checking if event already processed:', event.id);
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
          event,
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

    console.error('[Webhook] ERROR:', {
      ...errorDetails,
      statusCode,
      eventType: event?.type,
      eventId: event?.id,
      stack: error instanceof Error ? error.stack : undefined,
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
