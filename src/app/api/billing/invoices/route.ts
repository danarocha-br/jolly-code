import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getInvoices, findActiveSubscriptionId } from "@/lib/services/billing";
import { enforceRateLimit, publicLimiter, strictLimiter } from "@/lib/arcjet/limiters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["billing:invoices"],
    });
    if (limitResponse) return limitResponse;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userLimited = await enforceRateLimit(strictLimiter, request, {
      userId: user.id,
      tags: ["billing:invoices", "user"],
    });
    if (userLimited) return userLimited;

    // Get customer ID from query params or database
    const { searchParams } = new URL(request.url);
    let stripeCustomerId = searchParams.get("customerId");

    // Fetch profile once
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, stripe_subscription_status")
      .eq("id", user.id)
      .single();

    // Handle profile query errors
    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // If not provided, get from database
    if (!stripeCustomerId) {
      stripeCustomerId = (profile as any)?.stripe_customer_id;
    } else {
      // Verify the customer ID belongs to the user
      if ((profile as any)?.stripe_customer_id !== stripeCustomerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Fetch invoices from Stripe
    try {
      // Pass subscription ID if available to filter invoices
      let subscriptionId = (profile as any)?.stripe_subscription_id;
      const status = (profile as any)?.stripe_subscription_status;

      // If DB says no subscription or canceled, but user might have just upgraded (stale DB),
      // try to find the actual active subscription from Stripe to ensure we show the right invoices.
      if (!subscriptionId || (status !== 'active' && status !== 'trialing')) {
        const activeSubId = await findActiveSubscriptionId(stripeCustomerId);
        if (activeSubId) {
          subscriptionId = activeSubId;
        }
      }

      const invoices = await getInvoices(stripeCustomerId, 10, subscriptionId);
      return NextResponse.json({ invoices });
    } catch (error: any) {
      // getInvoices already handles resource_missing and returns []
      // This catch only handles unexpected errors
      console.error("Invoices API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Invoices API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

