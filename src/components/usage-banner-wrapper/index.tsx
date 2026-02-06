"use client";

import { useUserUsage } from "@/features/user/queries";
import { useUserStore } from "@/app/store";
import { UsageBanner } from "@/components/usage-banner";

export function UsageBannerWrapper() {
  const user = useUserStore((state) => state.user);
  const { data: usage, isLoading } = useUserUsage(user?.id);

  if (!user || isLoading || !usage) {
    return null;
  }

  return <UsageBanner usage={usage} />;
}

