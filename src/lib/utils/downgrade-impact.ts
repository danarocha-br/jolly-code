import type { PlanId } from "@/lib/config/plans";
import { getPlanConfig } from "@/lib/config/plans";
import type { UsageSummary } from "@/lib/services/usage-limits";

export type DowngradeImpact = {
  targetPlan: PlanId;
  snippets: {
    current: number;
    max: number | null;
    overLimit: number;
    willBeOverLimit: boolean;
  };
  animations: {
    current: number;
    max: number | null;
    overLimit: number;
    willBeOverLimit: boolean;
  };
  folders: {
    current: number;
    max: number | null;
    overLimit: number;
    willBeOverLimit: boolean;
  };
  videoExports: {
    current: number;
    max: number | null;
    overLimit: number;
    willBeOverLimit: boolean;
  };
  publicShares: {
    current: number;
    max: number | null;
    overLimit: number;
    willBeOverLimit: boolean;
  };
  hasAnyImpact: boolean;
};

/**
 * Calculate the impact of downgrading from current plan to target plan
 */
export function calculateDowngradeImpact(
  currentUsage: UsageSummary,
  targetPlan: PlanId
): DowngradeImpact {
  const targetPlanConfig = getPlanConfig(targetPlan);

  // Helper to convert Infinity to null for max values
  const toNullableMax = (value: number): number | null => {
    return value === Infinity ? null : value;
  };

  // Helper to calculate over-limit for a resource
  const calculateOverLimit = (
    current: number,
    max: number | null
  ): { overLimit: number; willBeOverLimit: boolean } => {
    if (max === null || max === Infinity) {
      return { overLimit: 0, willBeOverLimit: false };
    }
    const overLimit = Math.max(0, current - max);
    return { overLimit, willBeOverLimit: overLimit > 0 };
  };

  const snippetsMax = toNullableMax(targetPlanConfig.maxSnippets);
  const snippets = {
    current: currentUsage.snippets.current,
    max: snippetsMax,
    ...calculateOverLimit(currentUsage.snippets.current, snippetsMax),
  };

  const animationsMax = toNullableMax(targetPlanConfig.maxAnimations);
  const animations = {
    current: currentUsage.animations.current,
    max: animationsMax,
    ...calculateOverLimit(currentUsage.animations.current, animationsMax),
  };

  const foldersMax = toNullableMax(targetPlanConfig.maxSnippetsFolder);
  const folders = {
    current: currentUsage.folders.current,
    max: foldersMax,
    ...calculateOverLimit(currentUsage.folders.current, foldersMax),
  };

  const videoExportsMax = toNullableMax(targetPlanConfig.maxVideoExportCount);
  const videoExports = {
    current: currentUsage.videoExports.current,
    max: videoExportsMax,
    ...calculateOverLimit(currentUsage.videoExports.current, videoExportsMax),
  };

  const publicSharesMax = toNullableMax(targetPlanConfig.shareAsPublicURL);
  const publicShares = {
    current: currentUsage.publicShares.current,
    max: publicSharesMax,
    ...calculateOverLimit(currentUsage.publicShares.current, publicSharesMax),
  };

  const hasAnyImpact =
    snippets.willBeOverLimit ||
    animations.willBeOverLimit ||
    folders.willBeOverLimit ||
    videoExports.willBeOverLimit ||
    publicShares.willBeOverLimit;

  return {
    targetPlan,
    snippets,
    animations,
    folders,
    videoExports,
    publicShares,
    hasAnyImpact,
  };
}

/**
 * Get the next lower plan tier
 */
export function getDowngradeTarget(currentPlan: PlanId): PlanId | null {
  if (currentPlan === "pro") return "starter";
  if (currentPlan === "starter") return "free";
  return null; // Free has no downgrade target
}

