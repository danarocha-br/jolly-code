import { useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/utils/supabase/client";
import { getUserUsage, type UsageSummary } from "@/lib/services/usage-limits";
import type { PlanId } from "@/lib/config/plans";

export const USAGE_QUERY_KEY = "user-usage";
const USER_USAGE_STALE_TIME_MS = 5 * 60 * 1000;

export const fetchUserUsage = async (userId?: string): Promise<UsageSummary> => {
  const supabase = createClient();
  const resolvedUserId =
    userId ??
    (
      await supabase.auth.getUser().then(({ data }) => {
        return data.user?.id;
      })
    );

  if (!resolvedUserId) {
    throw new Error("User not authenticated");
  }

  return getUserUsage(supabase, resolvedUserId);
};

export const useUserUsage = (userId?: string) => {
  return useQuery({
    queryKey: [USAGE_QUERY_KEY, userId],
    queryFn: () => fetchUserUsage(userId),
    staleTime: USER_USAGE_STALE_TIME_MS,
    enabled: Boolean(userId),
    onError: (error) => {
      // Additional error handler specific to user usage queries
      // This ensures RPC errors are caught even if they're handled gracefully
      if (error instanceof Error && typeof window !== "undefined" && Sentry.getCurrentHub) {
        Sentry.withScope((scope) => {
          scope.setTag("query_type", "user_usage");
          scope.setTag("user_id", userId || "unknown");
          scope.setContext("user_usage_error", {
            user_id: userId,
            error_message: error.message,
            error_name: error.name,
          });
          Sentry.captureException(error);
          Sentry.flush(2000).catch((flushError) => {
            console.warn("[useUserUsage] Sentry flush failed:", flushError);
          });
        });
      }
      console.error("[useUserUsage] Query error:", error);
    },
  });
};

export const useUserPlan = (userId?: string) => {
  return useQuery<PlanId>({
    queryKey: ["user-plan", userId],
    queryFn: async () => {
      const usage = await fetchUserUsage(userId);
      return usage.plan;
    },
    staleTime: USER_USAGE_STALE_TIME_MS,
    enabled: Boolean(userId),
    onError: (error) => {
      // Additional error handler specific to user plan queries
      if (error instanceof Error && typeof window !== "undefined" && Sentry.getCurrentHub) {
        Sentry.withScope((scope) => {
          scope.setTag("query_type", "user_plan");
          scope.setTag("user_id", userId || "unknown");
          scope.setContext("user_plan_error", {
            user_id: userId,
            error_message: error.message,
            error_name: error.name,
          });
          Sentry.captureException(error);
          Sentry.flush(2000).catch((flushError) => {
            console.warn("[useUserPlan] Sentry flush failed:", flushError);
          });
        });
      }
      console.error("[useUserPlan] Query error:", error);
    },
  });
};
