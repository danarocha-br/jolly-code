"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import type { BillingInfo } from "@/lib/services/billing";
import { hasActiveSubscription } from "@/lib/services/billing";

type BillingInfoProps = {
  billingInfo: BillingInfo | null;
  isLoading?: boolean;
};

export function BillingInfoView({ billingInfo, isLoading }: BillingInfoProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billingInfo) {
    return null;
  }

  // Validate plan type
  const planId = billingInfo.plan as PlanId;
  if (!["free", "started", "pro"].includes(planId)) {
    console.error("Invalid plan type:", billingInfo.plan);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium mb-1">Invalid billing data</p>
            <p className="text-destructive/80">
              Your plan information could not be loaded. Please refresh the page or contact support if the issue persists.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planConfig = getPlanConfig(planId);
  const hasSubscription = hasActiveSubscription(billingInfo);
  const isCanceling =
    billingInfo.subscriptionCancelAtPeriodEnd === true;
  const nextBillingDate = billingInfo.subscriptionPeriodEnd
    ? new Date(billingInfo.subscriptionPeriodEnd)
    : null;

  // Determine pricing display
  let priceDisplay = "Free";
  let billingIntervalText = "";
  if (planConfig.pricing) {
    // Use concrete billing interval from billing info, fallback to monthly
    const interval = billingInfo.billingInterval || "monthly";
    priceDisplay = planConfig.pricing[interval].displayAmount;
    billingIntervalText = interval === "yearly" ? "/month • billed yearly" : "/month";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{planConfig.name}</span>
              {isCanceling && (
                <Badge variant="outline" className="text-xs">
                  Canceling
                </Badge>
              )}
              {billingInfo.stripeSubscriptionStatus === "active" && (
                <Badge variant="success">Active</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {planConfig.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{priceDisplay}</div>
            {planConfig.pricing && (
              <div className="text-sm text-muted-foreground">
                {billingIntervalText}
              </div>
            )}
          </div>
        </div>

        {hasSubscription && nextBillingDate && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium">Next billing date</p>
              <p className="text-sm text-muted-foreground">
                {nextBillingDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

