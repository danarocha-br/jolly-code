"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import type { BillingInfo } from "@/lib/services/billing";
import { hasActiveSubscription } from "@/lib/services/billing";
import { syncSubscription } from "@/actions/stripe/checkout";
import { reportBillingIssue } from "@/lib/sentry-utils";

type BillingInfoProps = {
  billingInfo: BillingInfo | null;
  isLoading?: boolean;
  userId?: string;
};

export function BillingInfoView({ billingInfo, isLoading, userId }: BillingInfoProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSubscription = async () => {
    // If we have a canceled subscription, find and sync the active one instead
    // Otherwise, sync the stored subscription ID
    const isCanceled = billingInfo?.stripeSubscriptionStatus === 'canceled';
    const subscriptionId = isCanceled ? undefined : (billingInfo?.stripeSubscriptionId || undefined);

    setIsSyncing(true);
    try {
      const result = await syncSubscription({
        subscriptionId,
      });

      if (result.success) {
        toast.success("Subscription data synced successfully");
        // Refresh the page to get updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to sync subscription data");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error syncing subscription:", error);
      
      // Report to Sentry in production
      reportBillingIssue(
        `Failed to sync subscription: ${errorMessage}`,
        "error",
        {
          userId,
          stripeSubscriptionId: subscriptionId || billingInfo?.stripeSubscriptionId || null,
          stripeCustomerId: billingInfo?.stripeCustomerId || null,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      
      toast.error("Failed to sync subscription data");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
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
    // This is expected in some cases (e.g., free users), so only log in dev
    if (process.env.NODE_ENV !== "production") {
      console.log("BillingInfoView - No billingInfo, returning null");
    }
    return null;
  }

  // Validate plan type
  const planId = billingInfo.plan as PlanId;
  if (!["free", "started", "pro"].includes(planId)) {
    const invalidPlan = billingInfo.plan;
    console.error("Invalid plan type:", invalidPlan);
    
    // Report to Sentry in production - this is a data integrity issue
    reportBillingIssue(
      `Invalid plan type detected: ${invalidPlan}`,
      "error",
      {
        userId,
        stripeCustomerId: billingInfo.stripeCustomerId,
        stripeSubscriptionId: billingInfo.stripeSubscriptionId,
        plan: invalidPlan,
        stripeSubscriptionStatus: billingInfo.stripeSubscriptionStatus,
      }
    );
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Oops! Billing hiccup</AlertTitle>
            <AlertDescription>
              Looks like we can't find your billing info right now. Give it a
              refresh — or tap support if things still look weird.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const planConfig = getPlanConfig(planId);
  const hasSubscription = hasActiveSubscription(billingInfo);
  const isCanceling = billingInfo.subscriptionCancelAtPeriodEnd === true;
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
    billingIntervalText =
      interval === "yearly" ? "/month • billed yearly" : "/month";
  }

  return (
    <Card className="p-0 bg-white dark:bg-card">
      <CardHeader className="p-0">
        <CardTitle className="bg-card dark:bg-muted px-3 py-1 rounded-t-xl font-normal text-sm">
          Current plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-0 py-2">
        <div className="space-y-2 px-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <span className="text-xl tracking-normal font-semibold">{planConfig.name}</span>
                {isCanceling && (
                  <Badge variant="destructive" className="text-xs">
                    Canceling
                  </Badge>
                )}
                {billingInfo.stripeSubscriptionStatus === "active" && (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            </div>
            <span className="text-right flex gap-1 items-center">
              <div className="text-xl font-semibold">{priceDisplay}</div>
              {planConfig.pricing && (
                <div className="text-sm text-muted-foreground mt-1">
                  {billingIntervalText}
                </div>
              )}
            </span>
          </div>
        </div>

        {hasSubscription && nextBillingDate && (
          <div className="">
            <Separator />
            <div className="flex justify-between items-center gap-6 px-3 py-3">
              <p className="text-sm text-muted-foreground">Next billing date</p>
              <p className="text-sm font-medium text-right">
                {nextBillingDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Note: Automatic background sync in getBillingInfo() handles missing subscription_period_end
            If data is still missing after automatic sync, it indicates a webhook delivery issue
            that should be investigated via monitoring/alerting rather than manual user action */}
      </CardContent>
    </Card>
  );
}
