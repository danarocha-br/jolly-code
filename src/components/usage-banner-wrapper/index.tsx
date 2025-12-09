"use client";

import { useUserUsage } from "@/features/user/queries";
import { useUserStore } from "@/app/store";
import { UsageBanner } from "@/components/usage-banner";
import type { UsageSummary } from "@/lib/services/usage-limits";

export function UsageBannerWrapper() {
  const user = useUserStore((state) => state.user);
  const { data: usageData, isLoading } = useUserUsage(user?.id);
  const usage = usageData as UsageSummary | undefined;

  if (!user || isLoading || !usage) {
    return null;
  }

  return <UsageBanner usage={usage} />;
}

