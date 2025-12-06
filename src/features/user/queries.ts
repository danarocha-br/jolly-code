import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";
import { getUserUsage, type UsageSummary } from "@/lib/services/usage-limits";
import type { PlanId } from "@/lib/config/plans";

export const USAGE_QUERY_KEY = "user-usage";

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
    staleTime: 30_000,
    enabled: Boolean(userId),
  });
};

export const useUserPlan = (userId?: string) => {
  return useQuery<PlanId>({
    queryKey: ["user-plan", userId],
    queryFn: async () => {
      const usage = await fetchUserUsage(userId);
      return usage.plan;
    },
    staleTime: 30_000,
    enabled: Boolean(userId),
  });
};

