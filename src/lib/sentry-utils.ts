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
  if (error instanceof Error && typeof window !== "undefined") {
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

