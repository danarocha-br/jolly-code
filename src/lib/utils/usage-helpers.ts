import type { UsageSummary } from "@/lib/services/usage-limits";
import { getUsagePercentage } from "@/lib/config/plans";

export type UsageThreshold = {
  percentage: number;
  level: "warning" | "critical" | "limit";
};

export type ResourcePercentage = {
  type: "snippets" | "animations" | "folders" | "videoExports" | "publicShares";
  percentage: number;
  current: number;
  max: number | null;
};

/**
 * Calculate usage percentages for all resource types
 * Returns array with percentages and metadata for reuse
 */
export function calculateAllUsagePercentages(usage: UsageSummary): ResourcePercentage[] {
  const resources: ResourcePercentage[] = [];

  if (usage.snippets.max !== null && usage.snippets.max !== Infinity) {
    resources.push({
      type: "snippets",
      percentage: getUsagePercentage(usage.snippets.current, usage.snippets.max),
      current: usage.snippets.current,
      max: usage.snippets.max,
    });
  }

  if (usage.animations.max !== null && usage.animations.max !== Infinity) {
    resources.push({
      type: "animations",
      percentage: getUsagePercentage(usage.animations.current, usage.animations.max),
      current: usage.animations.current,
      max: usage.animations.max,
    });
  }

  if (usage.folders.max !== null && usage.folders.max !== Infinity) {
    resources.push({
      type: "folders",
      percentage: getUsagePercentage(usage.folders.current, usage.folders.max),
      current: usage.folders.current,
      max: usage.folders.max,
    });
  }

  if (usage.videoExports.max !== null && usage.videoExports.max !== Infinity) {
    resources.push({
      type: "videoExports",
      percentage: getUsagePercentage(usage.videoExports.current, usage.videoExports.max),
      current: usage.videoExports.current,
      max: usage.videoExports.max,
    });
  }

  if (usage.publicShares.max !== null && usage.publicShares.max !== Infinity) {
    resources.push({
      type: "publicShares",
      percentage: getUsagePercentage(usage.publicShares.current, usage.publicShares.max),
      current: usage.publicShares.current,
      max: usage.publicShares.max,
    });
  }

  return resources;
}

/**
 * Calculate the maximum usage percentage across all resource types
 * Optimized version that reuses percentage calculations
 */
export function getMaxUsagePercentage(usage: UsageSummary): number {
  const resources = calculateAllUsagePercentages(usage);
  return resources.length > 0 ? Math.max(...resources.map((r) => r.percentage)) : 0;
}

/**
 * Get the threshold level based on usage percentage
 */
export function getUsageThreshold(percentage: number): UsageThreshold | null {
  if (percentage >= 100) {
    return { percentage, level: "limit" };
  }
  if (percentage >= 90) {
    return { percentage, level: "critical" };
  }
  if (percentage >= 80) {
    return { percentage, level: "warning" };
  }
  return null;
}

const RESOURCE_LABELS: Record<ResourcePercentage["type"], string> = {
  snippets: "snippets",
  animations: "animations",
  folders: "folders",
  videoExports: "video exports",
  publicShares: "public shares",
};

/**
 * Get the resource type(s) that are at or above the threshold
 * Optimized to reuse percentage calculations
 * @param usage - UsageSummary (only used if resourcePercentages not provided)
 * @param threshold - Percentage threshold (80, 90, or 100)
 * @param resourcePercentages - Optional pre-calculated percentages for performance
 */
export function getResourcesAtThreshold(
  usage: UsageSummary,
  threshold: number,
  resourcePercentages?: ResourcePercentage[]
): string[] {
  const resources = resourcePercentages ?? calculateAllUsagePercentages(usage);
  return resources.filter((r) => r.percentage >= threshold).map((r) => RESOURCE_LABELS[r.type]);
}

