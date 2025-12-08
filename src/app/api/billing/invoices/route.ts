import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getInvoices } from "@/lib/services/billing";
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

    // If not provided, get from database
    if (!stripeCustomerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      stripeCustomerId = (profile as any)?.stripe_customer_id;
    }

    // Verify the customer ID belongs to the user
    if (stripeCustomerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

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
      const invoices = await getInvoices(stripeCustomerId);
      return NextResponse.json({ invoices });
    } catch (error: any) {
      // Handle Stripe API errors
      if (error?.code === "resource_missing") {
        return NextResponse.json({ invoices: [] });
      }
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

