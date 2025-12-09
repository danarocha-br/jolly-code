import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { createClient } from "@/utils/supabase/client";
import { getUserUsage, type UsageSummary } from "@/lib/services/usage-limits";
import type { PlanId } from "@/lib/config/plans";
import { reportQueryError } from "@/lib/sentry-utils";

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
  const queryResult = useQuery<UsageSummary>({
    queryKey: [USAGE_QUERY_KEY, userId],
    queryFn: () => fetchUserUsage(userId),
    staleTime: USER_USAGE_STALE_TIME_MS,
    enabled: Boolean(userId),
  });

  // Handle errors (React Query v5 removed onError from useQuery)
  useEffect(() => {
    if (queryResult.error) {
      const error = queryResult.error;
      // Additional error handler specific to user usage queries
      // This ensures RPC errors are caught even if they're handled gracefully
      if (error instanceof Error) {
        reportQueryError(error, "user_usage", userId);
      }
      console.error("[useUserUsage] Query error:", error);
    }
  }, [queryResult.error, userId]);

  return queryResult;
};

export const useUserPlan = (userId?: string) => {
  const queryResult = useQuery<PlanId>({
    queryKey: ["user-plan", userId],
    queryFn: async () => {
      const usage = await fetchUserUsage(userId);
      return usage.plan;
    },
    staleTime: USER_USAGE_STALE_TIME_MS,
    enabled: Boolean(userId),
  });

  // Handle errors (React Query v5 removed onError from useQuery)
  useEffect(() => {
    if (queryResult.error) {
      const error = queryResult.error;
      // Additional error handler specific to user plan queries
      if (error instanceof Error) {
        reportQueryError(error, "user_plan", userId);
      }
      console.error("[useUserPlan] Query error:", error);
    }
  }, [queryResult.error, userId]);

  return queryResult;
};
