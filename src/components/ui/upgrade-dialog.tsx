import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PLANS, type PlanId } from "@/lib/config/plans";
import { cn } from "@/lib/utils";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  limitType?: "snippets" | "animations" | "slides";
  currentCount?: number;
  maxCount?: number | null;
};

const LIMIT_COPY: Record<NonNullable<UpgradeDialogProps["limitType"]>, string> = {
  snippets: "Upgrade to unlock unlimited snippets and keep every idea without friction.",
  animations: "Upgrade to create unlimited animations with zero save limits.",
  slides: "Upgrade to add unlimited slides and craft richer stories.",
};

const formatLimit = (count?: number | null) => {
  if (count === null || typeof count === "undefined") return "Unlimited";
  return `${count}`;
};

export function UpgradeDialog({
  open,
  onOpenChange,
  limitType = "snippets",
  currentCount = 0,
  maxCount,
}: UpgradeDialogProps) {
  const free = PLANS.free;
  const pro = PLANS.pro;
  const freeLimit =
    limitType === "snippets"
      ? free.maxSnippets
      : limitType === "animations"
        ? free.maxAnimations
        : free.maxSlidesPerAnimation;
  const limitLabel = limitType === "slides" ? "slides per animation" : limitType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <Badge variant="outline" className="w-fit">
            New • Plans
          </Badge>
          <DialogTitle className="text-2xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {LIMIT_COPY[limitType]}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3 text-sm">
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{free.name}</div>
              <Badge variant="outline">Free</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {free.features.join(" • ")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Limits: {formatLimit(maxCount ?? freeLimit)} {limitLabel}
              {maxCount ? "" : " per plan"}
            </p>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{pro.name}</div>
              <Badge>Pro</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {pro.features.join(" • ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {["Unlimited saves", "Faster workflow", "Priority support"].map((perk) => (
                <Badge
                  key={perk}
                  variant="outline"
                  className="bg-background text-muted-foreground"
                >
                  {perk}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <div className="font-semibold text-foreground">Current usage</div>
            <p>
              {currentCount}/{formatLimit(maxCount)} {limitType}
            </p>
          </div>
          <Button disabled variant="default">
            Upgrade (Coming Soon)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
