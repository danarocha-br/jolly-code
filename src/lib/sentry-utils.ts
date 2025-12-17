import * as Sentry from "@sentry/nextjs";

/**
 * Reports an error to Sentry with query-specific context.
 * Only runs in browser environments where Sentry is available.
 *
 * @param error - The error to report
 * @param queryType - The type of query that failed (e.g., "user_usage", "user_plan")
 * @param userId - Optional user ID for context
 */
export function reportQueryError(
  error: Error,
  queryType: string,
  userId?: string
): void {
  // Only report to Sentry in production/non-local environments
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    Sentry.withScope((scope) => {
      scope.setTag("query_type", queryType);
      scope.setTag("user_id", userId || "unknown");
      scope.setContext(`${queryType}_error`, {
        user_id: userId,
        error_message: error.message,
        error_name: error.name,
      });
      Sentry.captureException(error);
      Sentry.flush(2000).catch((flushError) => {
        console.warn(`[${queryType}] Sentry flush failed:`, flushError);
      });
    });
  }
}

/**
 * Reports a billing-related issue to Sentry with context.
 * Only runs in browser environments where Sentry is available.
 *
 * @param message - The error message or description
 * @param level - The severity level (default: "error")
 * @param context - Additional context about the billing issue
 */
export function reportBillingIssue(
  message: string,
  level: "error" | "warning" | "info" = "error",
  context?: {
    userId?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    plan?: string;
    [key: string]: unknown;
  }
): void {
  // Only report to Sentry in production/non-local environments
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setTag("error_source", "billing");
      scope.setTag("user_id", context?.userId || "unknown");
      
      if (context) {
        scope.setContext("billing_issue", {
          message,
          ...context,
          user_id: context.userId,
          stripe_customer_id: context.stripeCustomerId,
          stripe_subscription_id: context.stripeSubscriptionId,
          plan: context.plan,
        });
      }
      
      const error = new Error(message);
      error.name = "BillingIssue";
      Sentry.captureException(error);
      
      Sentry.flush(2000).catch((flushError) => {
        console.warn("[Billing] Sentry flush failed:", flushError);
      });
    });
  }
}

