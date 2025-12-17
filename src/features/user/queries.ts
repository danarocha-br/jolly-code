import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/utils/supabase/client";
import { getUserUsage, type UsageSummary } from "@/lib/services/usage-limits";
import type { PlanId } from "@/lib/config/plans";
import { reportQueryError } from "@/lib/sentry-utils";
import { getWatermarkPreference, type WatermarkPreference } from "@/lib/services/user-preferences";
import { updateWatermarkPreferenceAction } from "@/actions/user/update-watermark-preference";

export const USAGE_QUERY_KEY = "user-usage";
const USER_USAGE_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Resolves the user ID from the provided parameter or from the authenticated session.
 * @param userId - Optional user ID. If not provided, will be resolved from auth session.
 * @returns The resolved user ID as a string.
 * @throws Error if no user is authenticated.
 */
async function resolveUserId(userId?: string): Promise<string> {
  if (userId) {
    return userId;
  }

  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const resolvedUserId = data.user?.id;

  if (!resolvedUserId) {
    throw new Error("User not authenticated");
  }

  return resolvedUserId;
}

export const fetchUserUsage = async (userId?: string): Promise<UsageSummary> => {
  const supabase = createClient();
  const resolvedUserId = await resolveUserId(userId);

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

export const WATERMARK_PREFERENCE_QUERY_KEY = "watermark-preference";

export const fetchWatermarkPreference = async (
  userId?: string
): Promise<WatermarkPreference | null> => {
  const supabase = createClient();
  const resolvedUserId = await resolveUserId(userId);

  return getWatermarkPreference(supabase, resolvedUserId);
};

export const useWatermarkPreference = (userId?: string) => {
  const queryResult = useQuery<WatermarkPreference | null>({
    queryKey: [WATERMARK_PREFERENCE_QUERY_KEY, userId],
    queryFn: () => fetchWatermarkPreference(userId),
    staleTime: USER_USAGE_STALE_TIME_MS,
    enabled: Boolean(userId),
  });

  // Handle errors
  useEffect(() => {
    if (queryResult.error) {
      const error = queryResult.error;
      if (error instanceof Error) {
        reportQueryError(error, "watermark_preference", userId);
      }
      console.error("[useWatermarkPreference] Query error:", error);
    }
  }, [queryResult.error, userId]);

  return queryResult;
};

export const useUpdateWatermarkPreference = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hideWatermark: boolean) => {
      const result = await updateWatermarkPreferenceAction(hideWatermark);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update preference');
      }
      return result;
    },
    onMutate: async (hideWatermark: boolean) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [WATERMARK_PREFERENCE_QUERY_KEY, userId],
      });

      // Snapshot previous value
      const previousPreference = queryClient.getQueryData<WatermarkPreference | null>([
        WATERMARK_PREFERENCE_QUERY_KEY,
        userId,
      ]);

      // Optimistically update
      if (previousPreference) {
        queryClient.setQueryData<WatermarkPreference | null>(
          [WATERMARK_PREFERENCE_QUERY_KEY, userId],
          {
            ...previousPreference,
            hideWatermark,
          }
        );
      }

      return { previousPreference };
    },
    onError: (error, _hideWatermark, context) => {
      // Rollback on error
      if (context?.previousPreference) {
        queryClient.setQueryData(
          [WATERMARK_PREFERENCE_QUERY_KEY, userId],
          context.previousPreference
        );
      }

      // Report error to Sentry with context
      if (error instanceof Error) {
        // Report with comprehensive context including queryKey and previousPreference
        // Using Sentry directly to include all requested metadata
        if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
          Sentry.withScope((scope) => {
            scope.setTag("query_type", "watermark_preference_mutation");
            scope.setTag("user_id", userId || "unknown");
            scope.setContext("mutation_error", {
              queryKey: [WATERMARK_PREFERENCE_QUERY_KEY, userId],
              userId,
              previousPreference: context?.previousPreference,
              error_message: error.message,
              error_name: error.name,
            });
            Sentry.captureException(error);
            Sentry.flush(2000).catch((flushError) => {
              console.warn("[watermark_preference_mutation] Sentry flush failed:", flushError);
            });
          });
        }
        // Also call reportQueryError for consistency with other hooks
        reportQueryError(error, "watermark_preference_mutation", userId);
      }
      
      console.error('[useUpdateWatermarkPreference] Mutation error:', error);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: [WATERMARK_PREFERENCE_QUERY_KEY, userId],
      });
    },
  });
};
