import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPaymentMethod } from "@/lib/services/billing";
import { enforceRateLimit, publicLimiter, strictLimiter } from "@/lib/arcjet/limiters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["billing:payment-method"],
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
      tags: ["billing:payment-method", "user"],
    });
    if (userLimited) return userLimited;

    // Get customer ID from query params or database
    const { searchParams } = new URL(request.url);
    let customerId = searchParams.get("customerId");

    // Get user's Stripe customer ID and subscription ID from database
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    const userCustomerId = (profile?.stripe_customer_id ?? null) as string | null;
    const subscriptionId = (profile?.stripe_subscription_id ?? null) as string | null;

    // If customerId provided in query, verify it matches
    if (customerId && customerId !== userCustomerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Use customer ID from database if not provided
    customerId = customerId || userCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Fetch payment method from Stripe (check customer first, then subscription as fallback)
    try {
      const paymentMethod = await getPaymentMethod(customerId, subscriptionId);
      return NextResponse.json({ paymentMethod });
    } catch (error) {
      // Handle unexpected errors (getPaymentMethod already handles resource_missing)
      console.error("Payment method API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch payment method" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Payment method API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}

