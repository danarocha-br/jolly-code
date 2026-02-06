import { createClient } from "@/utils/supabase/server";
import { getStripeClient } from "@/lib/services/stripe";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { CheckoutSuccessClient } from "./checkout-success-client";
import { syncSubscriptionToDatabase } from "@/lib/services/subscription-sync";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params?.session_id;

  if (!sessionId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Missing checkout session</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t verify your payment without a session id.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/checkout/success&session_id=${encodeURIComponent(sessionId)}`
    );
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(
      sessionId,
      {
        expand: ["subscription"],
      }
    );

    const belongsToUser =
      session.metadata?.userId === user.id ||
      session.customer_email === user.email;

    if (!belongsToUser) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
          <h1 className="text-2xl font-semibold">Unable to verify payment</h1>
          <p className="text-muted-foreground">
            This checkout session doesn&apos;t belong to your account.
          </p>
        </div>
      );
    }

    const paymentStatus = session.payment_status;
    const subscription = session.subscription as Stripe.Subscription | null;
    const subscriptionStatus = subscription?.status;
    const plan = session.metadata?.plan ?? "your plan";

    const isPaid =
      paymentStatus === "paid" || paymentStatus === "no_payment_required";

    // FALLBACK: If subscription exists and webhook hasn't fired yet, sync manually
    // This ensures plan is updated even if webhook is delayed or not configured
    if (isPaid && subscription) {
      try {
        const subscriptionId =
          typeof subscription === "string" ? subscription : subscription.id;

        // Fetch full subscription details if needed (subscription might be just an ID from session)
        let fullSubscription: Stripe.Subscription;
        if (typeof subscription === "string") {
          fullSubscription = await getStripeClient().subscriptions.retrieve(
            subscription,
            {
              expand: ["items.data.price"],
            }
          );
        } else if (!subscription.items?.data) {
          fullSubscription = await getStripeClient().subscriptions.retrieve(
            subscription.id,
            {
              expand: ["items.data.price"],
            }
          );
        } else {
          fullSubscription = subscription;
        }

        const syncResult = await syncSubscriptionToDatabase(fullSubscription);
        if (syncResult) {
          console.log(
            "[CheckoutSuccess] Fallback sync succeeded:",
            { userId: syncResult.userId, planId: syncResult.planId }
          );
        }
      } catch (error) {
        // Log but don't fail the page - webhook will handle it eventually
        console.error(
          "[CheckoutSuccess] Fallback sync failed (webhook will handle it):",
          error
        );
      }
    }

    // Use client component to handle redirect and toast
    if (isPaid) {
      return <CheckoutSuccessClient plan={plan} sessionId={sessionId} />;
    }

    // If payment is still processing, show a loading state
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Processing payment</h1>
        <p className="text-muted-foreground">
          We&apos;re finalizing your {plan} subscription. Current payment
          status: {paymentStatus}.
        </p>
        {subscriptionStatus && (
          <p className="mt-1 text-sm text-muted-foreground">
            Subscription status: {subscriptionStatus}
          </p>
        )}
      </div>
    );
  } catch (err) {
    const userId = user?.id ?? "unknown";
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    console.error("[CheckoutSuccess] Failed to verify checkout session", {
      sessionId: sessionId ?? "unknown",
      userId,
      error: errorMessage,
      stack: errorStack,
    });

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">
          Couldn&apos;t verify checkout
        </h1>
        <p className="text-muted-foreground">
          Please refresh or check your email for confirmation.
        </p>
      </div>
    );
  }
}
