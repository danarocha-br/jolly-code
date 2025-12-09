import { createClient } from "@/utils/supabase/server";
import { getStripeClient } from "@/lib/services/stripe";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

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

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-lg border bg-card px-6 py-8 shadow-sm">
          <h1 className="text-3xl font-semibold">
            Checkout {isPaid ? "confirmed" : "processing"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isPaid
              ? `You’re all set! Your ${plan} subscription is active.`
              : `We’re finalizing your ${plan} subscription. Current payment status: ${paymentStatus}.`}
          </p>
          {subscriptionStatus && (
            <p className="mt-1 text-sm text-muted-foreground">
              Subscription status: {subscriptionStatus}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Session ID: {sessionId}</p>
            <p>
              {" "}
              Amount:{" "}
              {session.amount_total != null
                ? `$${(session.amount_total / 100).toFixed(2)}`
                : "—"}
            </p>
          </div>
        </div>
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
