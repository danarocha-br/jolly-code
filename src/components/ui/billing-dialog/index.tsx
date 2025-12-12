"use client";

import { useState, useTransition } from "react";
import { RiAlertLine } from "react-icons/ri";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BillingInfoView } from "./components/billing-info";
import { PaymentMethod } from "./components/payment-method";
import { InvoiceList } from "./components/invoice-list";
import {
  useBillingInfo,
  usePaymentMethod,
  useInvoices,
} from "@/features/billing/queries";
import { useUserStore } from "@/app/store";
import { createPortalSession } from "@/actions/stripe/checkout";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { DowngradeDialog } from "@/components/ui/downgrade-dialog";
import { useUserPlan } from "@/features/user/queries";
import { getDowngradeTarget } from "@/lib/utils/downgrade-impact";
import type { PlanId } from "@/lib/config/plans";
import { hasActiveSubscription } from "@/lib/services/billing";
import { Alert, AlertDescription, AlertTitle } from "../alert";

type BillingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BillingDialog({ open, onOpenChange }: BillingDialogProps) {
  const { user } = useUserStore();
  const userId = user?.id;
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isDowngradeOpen, setIsDowngradeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    data: billingInfo,
    isLoading: isBillingLoading,
    error: billingError,
  } = useBillingInfo(userId);
  
  const hasSubscription = hasActiveSubscription(billingInfo);
  // Show payment method and invoices if there's an active subscription OR if there's a subscription ID
  const shouldShowBillingDetails = hasSubscription || Boolean(billingInfo?.stripeSubscriptionId);
  const {
    data: paymentMethod,
    isLoading: isPaymentLoading,
    error: paymentError,
  } = usePaymentMethod(
    shouldShowBillingDetails ? billingInfo?.stripeCustomerId || undefined : undefined
  );
  const {
    data: invoices,
    isLoading: isInvoicesLoading,
    error: invoicesError,
  } = useInvoices(
    shouldShowBillingDetails ? billingInfo?.stripeCustomerId || undefined : undefined
  );
  const { data: planData } = useUserPlan(userId);
  const currentPlan: PlanId | undefined =
    planData && ["free", "started", "pro"].includes(planData as string)
      ? (planData as PlanId)
      : undefined;

  const handleOpenPortal = () => {
    startTransition(async () => {
      try {
        const result = await createPortalSession();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.url) {
          window.location.href = result.url;
        }
      } catch (error) {
        console.error("Error opening portal:", error);
        toast.error("Failed to open customer portal");
      }
    });
  };

  const downgradeTarget = currentPlan ? getDowngradeTarget(currentPlan) : null;
  const canDowngrade = hasSubscription && downgradeTarget !== null;

  return (
    <>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        currentPlan={currentPlan || "free"}
      />
      <DowngradeDialog
        open={isDowngradeOpen}
        onOpenChange={setIsDowngradeOpen}
        currentPlan={currentPlan || "free"}
        targetPlan={downgradeTarget || undefined}
        userId={userId}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage your subscription</DialogTitle>
            <DialogDescription>
              Keep track of your current plan, payment details, and billing history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="px-4 space-y-4">

              {billingError && (
                <Alert variant="destructive">
                  <RiAlertLine className="h-5 w-5" />
                  <AlertTitle>
                    Uh-oh! We couldn’t load your billing info
                  </AlertTitle>
                  <AlertDescription>
                    Something didn’t go as planned. Please refresh and try again. If the issue persists, we’re here to help!
                  </AlertDescription>
                </Alert>
              )}

              <BillingInfoView
                billingInfo={billingInfo || null}
                isLoading={isBillingLoading}
                userId={userId}
              />

              {/* Show payment method and invoices if there's an active subscription OR if there's a subscription ID (for canceled subscriptions that still have access) */}
              {shouldShowBillingDetails && (
                <>
                  {paymentError && (
                    <Alert variant="destructive">
                      <RiAlertLine className="h-5 w-5" />
                      <AlertTitle>
                        Uh-oh! We couldn't load your payment method
                      </AlertTitle>
                      <AlertDescription>
                        Something didn't go as planned. Please refresh and try again. <br /> If the issue persists, we're here to help!
                      </AlertDescription>
                    </Alert>
                  )}
                  <PaymentMethod
                    paymentMethod={paymentMethod || null}
                    isLoading={isPaymentLoading}
                  />

                  {invoicesError && (
                    <Alert variant="destructive">
                      <RiAlertLine className="h-5 w-5" />
                      <AlertTitle>
                        Uh-oh! We couldn't load your invoices
                      </AlertTitle>
                      <AlertDescription>
                        Something didn't go as planned. Please refresh and try again. <br /> If the issue persists, we're here to help!
                      </AlertDescription>
                    </Alert>
                  )}
                  <InvoiceList
                    invoices={invoices || []}
                    isLoading={isInvoicesLoading}
                  />
                </>
              )}
            </div>

            <Separator />

            <div className="flex gap-3 px-4">
              {shouldShowBillingDetails ? (
                <>
                  <Button
                    onClick={handleOpenPortal}
                    disabled={isPending}
                    className="w-full"
                    size="lg"
                  >
                    {isPending ? (
                      <>
                        <i className="ri-loader-4-line text-lg mr-2 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <i className="ri-external-link-line text-lg mr-2" />
                        Open Customer Portal
                      </>
                    )}
                  </Button>
                  {canDowngrade && (
                    <Button
                      onClick={() => setIsDowngradeOpen(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <i className="ri-arrow-down-line text-lg mr-2" />
                      Downgrade Plan
                    </Button>
                  )}
                </>
              ) : (billingInfo?.stripeSubscriptionId && currentPlan === 'free') ? (
                <>
                  <Button
                    onClick={async () => {
                      const { syncSubscription } = await import('@/actions/stripe/checkout');
                      const result = await syncSubscription({ subscriptionId: billingInfo.stripeSubscriptionId });
                      if (result.success) {
                        window.location.reload();
                      } else {
                        toast.error(result.error || 'Failed to restore subscription');
                      }
                    }}
                    className="w-full"
                    size="lg"
                  >
                    <i className="ri-refresh-line text-lg mr-2" />
                    Restore Subscription
                  </Button>
                  <Button
                    onClick={() => setIsUpgradeOpen(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Upgrade Plan
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  Upgrade Plan
                </Button>
              )}

            </div>
            {!shouldShowBillingDetails && (
              <p className="text-xs text-center text-muted-foreground">
                Upgrade to unlock more features and save your work
              </p>
            )}

            {shouldShowBillingDetails && (
              <p className="text-xs text-center text-muted-foreground">
                Use the Customer Portal to update your payment method, view
                invoices, and manage your subscription
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
