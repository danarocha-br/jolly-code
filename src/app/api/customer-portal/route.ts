import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type Stripe from "stripe";

import { createCustomerPortalSession } from '@/lib/services/stripe';
import { enforceRateLimit, publicLimiter, strictLimiter } from '@/lib/arcjet/limiters';
import { env } from '@/env.mjs';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'stripe_customer_id'>;

export async function POST(request: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["customer-portal"],
    });
    if (limitResponse) return limitResponse;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userLimited = await enforceRateLimit(strictLimiter, request, {
      userId: user.id,
      tags: ["customer-portal", "user"],
    });
    if (userLimited) return userLimited;

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Get flow intent from request
    let flow: "update_subscription" | undefined;
    try {
      const body = await request.json();
      if (body.flow === "update_subscription") {
        flow = "update_subscription";
      }
    } catch {
      // Body might be empty, that's fine
    }

    const stripeCustomerId = profile?.stripe_customer_id;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Prepare flow data if requested
    let flow_data: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;

    if (flow === "update_subscription") {
      // We need an active subscription ID for this flow
      // Use the robust finder we added to billing.ts to ensure we get the real active one
      // even if the DB is stale
      const { findActiveSubscriptionId } = await import("@/lib/services/billing");
      const activeSubscriptionId = await findActiveSubscriptionId(stripeCustomerId);

      if (activeSubscriptionId) {
        flow_data = {
          type: "subscription_update",
          subscription_update: {
            subscription: activeSubscriptionId,
          },
        };
      }
    }

    // Create customer portal session
    let portalSession;
    try {
      portalSession = await createCustomerPortalSession({
        customerId: stripeCustomerId,
        returnUrl: `${env.NEXT_PUBLIC_APP_URL}/?stripe_action=portal_return`,
        flow_data,
      });
    } catch (error) {
      // If we tried a specific flow and it failed (e.g. feature disabled in Stripe),
      // fallback to the generic portal so the user isn't stuck.
      if (flow_data) {
        console.warn('Portal deep link failed, retrying with generic session:', error);
        portalSession = await createCustomerPortalSession({
          customerId: stripeCustomerId,
          returnUrl: `${env.NEXT_PUBLIC_APP_URL}/?stripe_action=portal_return`,
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
