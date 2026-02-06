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
  
  const resourceKeys: Array<ResourcePercentage["type"]> = [
    "snippets",
    "animations",
    "folders",
    "videoExports",
    "publicShares",
  ];

  for (const key of resourceKeys) {
    const resource = usage[key];
    if (resource.max !== null && resource.max !== Infinity) {
      resources.push({
        type: key,
        percentage: getUsagePercentage(resource.current, resource.max),
        current: resource.current,
        max: resource.max,
      });
    }
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

