import type { PlanId } from "@/lib/config/plans";
import { getPlanConfig, PLANS } from "@/lib/config/plans";
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
  const currentPlan = currentUsage.plan;
  const targetPlanConfig = getPlanConfig(targetPlan);

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

  const snippets = {
    current: currentUsage.snippets.current,
    max: targetPlanConfig.maxSnippets === Infinity ? null : targetPlanConfig.maxSnippets,
    ...calculateOverLimit(
      currentUsage.snippets.current,
      targetPlanConfig.maxSnippets === Infinity ? null : targetPlanConfig.maxSnippets
    ),
  };

  const animations = {
    current: currentUsage.animations.current,
    max: targetPlanConfig.maxAnimations === Infinity ? null : targetPlanConfig.maxAnimations,
    ...calculateOverLimit(
      currentUsage.animations.current,
      targetPlanConfig.maxAnimations === Infinity ? null : targetPlanConfig.maxAnimations
    ),
  };

  const folders = {
    current: currentUsage.folders.current,
    max: targetPlanConfig.maxSnippetsFolder === Infinity ? null : targetPlanConfig.maxSnippetsFolder,
    ...calculateOverLimit(
      currentUsage.folders.current,
      targetPlanConfig.maxSnippetsFolder === Infinity ? null : targetPlanConfig.maxSnippetsFolder
    ),
  };

  const videoExports = {
    current: currentUsage.videoExports.current,
    max: targetPlanConfig.maxVideoExportCount === Infinity ? null : targetPlanConfig.maxVideoExportCount,
    ...calculateOverLimit(
      currentUsage.videoExports.current,
      targetPlanConfig.maxVideoExportCount === Infinity ? null : targetPlanConfig.maxVideoExportCount
    ),
  };

  const publicShares = {
    current: currentUsage.publicShares.current,
    max: targetPlanConfig.shareAsPublicURL === Infinity ? null : targetPlanConfig.shareAsPublicURL,
    ...calculateOverLimit(
      currentUsage.publicShares.current,
      targetPlanConfig.shareAsPublicURL === Infinity ? null : targetPlanConfig.shareAsPublicURL
    ),
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
  if (currentPlan === "pro") return "started";
  if (currentPlan === "started") return "free";
  return null; // Free has no downgrade target
}

