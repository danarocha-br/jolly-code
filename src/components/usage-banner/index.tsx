"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UsageSummary } from "@/lib/services/usage-limits";
import { hasUnlimitedPlan } from "@/lib/services/usage-limits";
import {
  getMaxUsagePercentage,
  getUsageThreshold,
  getResourcesAtThreshold,
  calculateAllUsagePercentages,
} from "@/lib/utils/usage-helpers";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";

type UsageBannerProps = {
  usage: UsageSummary;
  onDismiss?: () => void;
  className?: string;
};

function formatResourceList(resources: string[]): string {
  if (resources.length === 0) return "";
  if (resources.length === 1) return resources[0];
  if (resources.length === 2) return `${resources[0]} and ${resources[1]}`;
  return `${resources.slice(0, -1).join(", ")}, and ${resources[resources.length - 1]}`;
}

export function UsageBanner({ usage, onDismiss, className }: UsageBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Memoize expensive calculations - must be called before any early returns
  const resourcePercentages = useMemo(() => {
    if (!usage) return [];
    return calculateAllUsagePercentages(usage);
  }, [usage]);
  
  const maxPercentage = useMemo(
    () => (resourcePercentages.length > 0 ? Math.max(...resourcePercentages.map((r) => r.percentage)) : 0),
    [resourcePercentages]
  );
  
  const threshold = useMemo(() => getUsageThreshold(maxPercentage), [maxPercentage]);

  const resources = useMemo(() => {
    if (!usage) return [];
    return getResourcesAtThreshold(usage, 80, resourcePercentages);
  }, [usage, resourcePercentages]);
  
  const resourceText = useMemo(() => formatResourceList(resources), [resources]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Memoize banner content to avoid recalculating on every render
  const content = useMemo(() => {
    if (!threshold) return null;
    
    switch (threshold.level) {
      case "limit":
        return {
          title: "Usage limit reached",
          message: `You've reached your plan limit for ${resourceText}. Upgrade to continue using all features.`,
          variant: "destructive" as const,
          showUpgrade: true,
        };
      case "critical":
        return {
          title: "Almost at your limit",
          message: `You're at ${Math.round(maxPercentage)}% of your ${resourceText} limit. Upgrade now to avoid interruptions.`,
          variant: "destructive" as const,
          showUpgrade: true,
        };
      case "warning":
        return {
          title: "Approaching your limit",
          message: `You're at ${Math.round(maxPercentage)}% of your ${resourceText} limit. Consider upgrading to avoid interruptions.`,
          variant: "default" as const,
          showUpgrade: true,
        };
    }
  }, [threshold, resourceText, maxPercentage]);

  // Early returns for performance - after all hooks
  // Hide banner for unlimited plans (all resource limits are null/Infinity)
  if (isDismissed || hasUnlimitedPlan(usage) || !usage || !threshold || !content) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b px-4 py-3 text-sm",
          threshold.level === "limit" && "bg-destructive/10 border-destructive/20",
          threshold.level === "critical" && "bg-amber-500/10 border-amber-500/20",
          threshold.level === "warning" && "bg-blue-500/10 border-blue-500/20",
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge
            variant={threshold.level === "limit" ? "destructive" : threshold.level === "critical" ? "default" : "outline"}
            className="shrink-0"
          >
            {Math.round(maxPercentage)}%
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{content.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{content.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {content.showUpgrade && (
            <Button
              size="sm"
              variant={threshold.level === "limit" ? "default" : "secondary"}
              onClick={() => setUpgradeDialogOpen(true)}
              className="shrink-0"
            >
              Upgrade
            </Button>
          )}
          {onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              type="button"
              aria-label="Dismiss banner"
            >
              <i className="ri-close-line text-lg" />
            </Button>
          )}
        </div>
      </div>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentPlan={usage.plan}
      />
    </>
  );
}

