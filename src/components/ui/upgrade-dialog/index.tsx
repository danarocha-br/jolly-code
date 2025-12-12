"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
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
import {
  PLANS,
  type BillingInterval,
  type PlanConfig,
  type PlanId,
} from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  limitType?:
  | "snippets"
  | "animations"
  | "slides"
  | "folders"
  | "videoExports"
  | "publicShares";
  currentCount?: number;
  maxCount?: number | null;
  currentPlan?: PlanId;
};

const LIMIT_COPY: Record<
  NonNullable<UpgradeDialogProps["limitType"]>,
  string
> = {
  snippets:
    "Upgrade to save more snippets and keep every idea without friction.",
  animations: "Upgrade to create more animations with higher save limits.",
  slides: "Upgrade to add more slides and craft richer stories.",
  folders: "Upgrade to organize with more folders.",
  videoExports: "Upgrade to export more videos.",
  publicShares: "Upgrade to share more projects publicly.",
};

const formatLimit = (count?: number | null) => {
  if (count === null || typeof count === "undefined" || count === Infinity)
    return "Unlimited";
  return `${count}`;
};

const getLimitForPlan = (
  plan: PlanConfig,
  limitType: NonNullable<UpgradeDialogProps["limitType"]>
) => {
  switch (limitType) {
    case "snippets":
      return plan.maxSnippets;
    case "animations":
      return plan.maxAnimations;
    case "slides":
      return plan.maxSlidesPerAnimation;
    case "folders":
      return plan.maxSnippetsFolder;
    case "videoExports":
      return plan.maxVideoExportCount;
    case "publicShares":
    default:
      return plan.shareAsPublicURL;
  }
};

const formatPrice = (plan: PlanConfig, interval: BillingInterval) => {
  if (!plan.pricing) return "$0";
  return plan.pricing[interval].displayAmount;
};

const intervalLabel: Record<BillingInterval, string> = {
  monthly: "/month",
  yearly: "/month • billed yearly",
};

const PLAN_ORDER: PlanId[] = ["free", "started", "pro"];

const CheckItem = ({ children }: { children: ReactNode }) => (
  <li className="flex items-start gap-2 text-sm text-foreground">
    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/30 bg-foreground/5 text-xs text-success">
      ✓
    </span>
    <span className="leading-relaxed text-foreground">{children}</span>
  </li>
);

const plans = PLAN_ORDER.map((id) => PLANS[id]);

export function UpgradeDialog({
  open,
  onOpenChange,
  limitType = "snippets",
  currentCount = 0,
  maxCount,
  currentPlan = "free",
}: UpgradeDialogProps) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    currentPlan === "pro"
      ? "pro"
      : currentPlan === "started"
        ? "pro"
        : "started"
  );
  const [isPending, startTransition] = useTransition();

  const limitLabel =
    limitType === "slides"
      ? "slides per animation"
      : limitType === "folders"
        ? "folders"
        : limitType === "videoExports"
          ? "video exports"
          : limitType === "publicShares"
            ? "public views/month"
            : limitType;

  const upgradeTitle =
    currentPlan === "free" ? "Upgrade plan" : "Change your plan";

  const currentPlanLimit = getLimitForPlan(PLANS[currentPlan], limitType);

  const handleCheckout = (planOverride?: PlanId) => {
    const planToCheckout = planOverride ?? selectedPlan;

    if (planToCheckout === "free" || planToCheckout === currentPlan) return;

    startTransition(async () => {
      try {
        // If updating from a paid plan (started/pro) to another paid plan,
        // redirect to customer portal instead of creating a new checkout session.
        // This prevents duplicate subscriptions.
        if (currentPlan !== "free") {
          const response = await fetch("/api/customer-portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();

          if (!response.ok || !data.url) {
            toast.error(data.error || "Unable to access customer portal.");
            return;
          }

          window.location.href = data.url;
          return;
        }

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: planToCheckout,
            interval: billingInterval,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          toast.error(data.error || "Unable to start checkout right now.");
          return;
        }

        window.location.href = data.url;
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong processing your request.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="gap-2 border-b border-border/60 bg-muted/30 px-6 pt-5 text-left">
          <Badge variant="outline" className="w-fit">
            Plans & Billing
          </Badge>
          <DialogTitle className="text-2xl">{upgradeTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 px-6 pb-6 text-sm">
          <div className="rounded-full bg-muted px-1 py-1 text-sm font-medium">
            <div className="grid grid-cols-2 gap-1">
              {(["monthly", "yearly"] as BillingInterval[]).map((interval) => (
                <Button
                  key={interval}
                  variant="secondary"
                  onClick={() => setBillingInterval(interval)}
                  className={cn(
                    "rounded-full px-3 py-2 transition",
                    billingInterval === interval
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/20"
                  )}
                >
                  {interval === "monthly" ? "Monthly" : "Yearly"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = currentPlan === plan.id;
              const limit = formatLimit(getLimitForPlan(plan, limitType));
              const canCheckout = Boolean(plan.pricing);

              return (
                <div
                  key={plan.id}
                  role="button"
                  aria-pressed={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedPlan(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPlan(plan.id);
                    }
                  }}
                  className={cn(
                    "group relative flex h-full w-full flex-col justify-between gap-3 rounded-xl border bg-card/70 p-5 text-left transition",
                    "hover:border-foreground/30 hover:bg-card",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isSelected &&
                    "border-primary bg-primary/5 ring-2 ring-primary/30"
                  )}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-background/60">
                        {plan.name}
                      </Badge>
                      {plan.id === "started" && (
                        <Badge variant="success">Most popular</Badge>
                      )}
                      {isCurrent && <Badge>Current</Badge>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2 text-3xl font-semibold text-foreground">
                        <span>{formatPrice(plan, billingInterval)}</span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {plan.pricing ? intervalLabel[billingInterval] : ""}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                      <p className="text-xs text-foreground">
                        {limit} {limitLabel}
                      </p>
                    </div>

                    <Separator className="opacity-60" />

                    <ul className="grid gap-2">
                      {plan.features.map((feature) => (
                        <CheckItem key={feature}>{feature}</CheckItem>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className="w-full"
                    variant={isSelected ? "default" : "secondary"}
                    disabled={
                      isPending || plan.id === currentPlan || !canCheckout
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlan(plan.id);
                      if (plan.id !== currentPlan && plan.id !== "free") {
                        handleCheckout(plan.id);
                      }
                    }}
                  >
                    {plan.id === currentPlan
                      ? "Current plan"
                      : plan.id === "free"
                        ? "Free forever"
                        : isPending && isSelected
                          ? "Redirecting..."
                          : currentPlan !== "free"
                            ? "Manage Plan"
                            : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Selected plan</p>
              <p className="text-base font-semibold text-foreground">
                {PLANS[selectedPlan].name} •{" "}
                {formatPrice(PLANS[selectedPlan], billingInterval)}{" "}
                {PLANS[selectedPlan].pricing
                  ? intervalLabel[billingInterval]
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
