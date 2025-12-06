import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PLANS } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import type { UsageSummary } from "@/lib/services/usage-limits";

type UsageStatsWidgetProps = {
  usage?: UsageSummary;
  isLoading?: boolean;
  onUpgrade?: () => void;
  className?: string;
};

const getRatio = (current: number, max: number | null) => {
  if (!max) return 0;
  return Math.min(current / max, 1);
};

const getBarColor = (ratio: number) => {
  if (ratio >= 0.9) return "bg-destructive";
  if (ratio >= 0.7) return "bg-amber-500";
  return "bg-success";
};

const UsageRow = ({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | null;
}) => {
  const ratio = getRatio(current, max);
  const maxLabel = max ? `${max}` : "Unlimited";
  const progressWidth = max ? `${ratio * 100}%` : "100%";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">
          {current}/{maxLabel}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-subdued dark:bg-muted">
        <div
          className={cn("h-full transition-all", getBarColor(ratio))}
          style={{ width: progressWidth }}
        />
      </div>
    </div>
  );
};

export function UsageStatsWidget({
  usage,
  isLoading,
  onUpgrade,
  className,
}: UsageStatsWidgetProps) {
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const planName = PLANS[usage.plan].name;

  return (
    <Card className={cn("w-full shadow-none", className)}>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Usage</p>
            <p className="text-sm font-semibold">{planName} plan</p>
          </div>
          <Badge variant={usage.plan === "pro" ? "default" : "success"}>
            {usage.plan === "pro" ? "Pro" : "Free"}
          </Badge>
        </div>

        <UsageRow
          label="Snippets"
          current={usage.snippets.current}
          max={usage.snippets.max}
        />
        <UsageRow
          label="Animations"
          current={usage.animations.current}
          max={usage.animations.max}
        />

        {usage.plan === "free" && (
          <Button size="sm" className="w-full mt-3" onClick={onUpgrade} variant="default">
            Upgrade (Coming soon)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

