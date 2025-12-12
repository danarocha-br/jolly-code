"use client";

import { RiAlertLine, RiInformationLine } from "react-icons/ri";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { DowngradeFeature } from "@/features/downgrade";
import { hasActiveSubscription } from "@/lib/services/billing";
import { BillingInfoView } from "./ui/billing-info";
import { PaymentMethod } from "./ui/payment-method";
import { InvoiceList } from "./ui/invoice-list";
import {
  useBillingInfo,
  usePaymentMethod,
  useInvoices,
} from "./queries";
import { useBillingDialog } from "./hooks/use-billing-dialog";
import type { BillingDialogProps } from "./dtos";

export function BillingFeature({ open, onOpenChange }: BillingDialogProps) {
  const {
    userId,
    isUpgradeOpen,
    isDowngradeOpen,
    isPending,
    currentPlan,
    downgradeTarget,
    setIsUpgradeOpen,
    setIsDowngradeOpen,
    handleOpenPortal,
  } = useBillingDialog();

  const {
    data: billingInfo,
    isLoading: isBillingLoading,
    error: billingError,
  } = useBillingInfo(userId);

  const hasSubscription = hasActiveSubscription(billingInfo);
  // Show payment method and invoices if there's an active subscription OR if there's a subscription ID
  const shouldShowBillingDetails =
    hasSubscription || Boolean(billingInfo?.stripeSubscriptionId);

  const {
    data: paymentMethod,
    isLoading: isPaymentLoading,
    error: paymentError,
  } = usePaymentMethod(
    shouldShowBillingDetails
      ? billingInfo?.stripeCustomerId || undefined
      : undefined
  );

  const {
    data: invoices,
    isLoading: isInvoicesLoading,
    error: invoicesError,
  } = useInvoices(
    shouldShowBillingDetails
      ? billingInfo?.stripeCustomerId || undefined
      : undefined
  );

  const canDowngrade = hasSubscription && downgradeTarget !== null;

  return (
    <>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        currentPlan={currentPlan || "free"}
      />
      <DowngradeFeature
        open={isDowngradeOpen}
        onOpenChange={setIsDowngradeOpen}
        currentPlan={currentPlan || "free"}
        targetPlan={downgradeTarget || undefined}
        userId={userId}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Manage your subscription</DialogTitle>
            <DialogDescription>
              Keep track of your current plan, payment details, and billing
              history.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="px-4 space-y-4">
              {billingError && (
                <Alert variant="destructive">
                  <RiAlertLine className="h-5 w-5" />
                  <AlertTitle>
                    Uh-oh! We couldn't load your billing info
                  </AlertTitle>
                  <AlertDescription>
                    Something didn't go as planned. Please refresh and try
                    again. If the issue persists, we're here to help!
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
                        Something didn't go as planned. Please refresh and try
                        again. <br /> If the issue persists, we're here to help!
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
                        Something didn't go as planned. Please refresh and try
                        again. <br /> If the issue persists, we're here to help!
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

            <div className="flex flex-col gap-3 px-4">
              <div className="flex gap-3">
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
                          Open customer portal
                        </>
                      )}
                    </Button>
                    {canDowngrade && !billingInfo?.subscriptionCancelAtPeriodEnd && (
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
                ) : billingInfo?.stripeSubscriptionId &&
                  currentPlan === "free" ? (
                  <>
                    <Button
                      onClick={async () => {
                        const { syncSubscription } = await import(
                          "@/actions/stripe/checkout"
                        );
                        toast.promise(
                          syncSubscription({
                            subscriptionId: billingInfo.stripeSubscriptionId || undefined,
                          }),
                          {
                            loading: 'Restoring subscription...',
                            success: () => {
                              window.location.reload();
                              return 'Subscription restored!';
                            },
                            error: (err) => err?.message || 'Failed to restore subscription'
                          }
                        );
                      }}
                      className="w-full"
                      size="lg"
                    >
                      <i className="ri-refresh-line text-lg mr-2" />
                      Restore subscription
                    </Button>
                    <Button
                      onClick={() => setIsUpgradeOpen(true)}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      Upgrade plan
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsUpgradeOpen(true)}
                    className="w-full"
                    size="lg"
                  >
                    Upgrade plan
                  </Button>
                )}
              </div>

              {shouldShowBillingDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs self-center h-auto py-1"
                  onClick={async () => {
                    const { syncSubscription } = await import(
                      "@/actions/stripe/checkout"
                    );
                    toast.promise(
                      syncSubscription({}),
                      {
                        loading: 'Syncing subscription status...',
                        success: () => {
                          window.location.reload();
                          return 'Status updated';
                        },
                        error: 'Failed to sync status'
                      }
                    );
                  }}
                >
                  <i className="ri-refresh-line mr-1" />
                  Refresh subscription status
                </Button>
              )}
            </div>
            {!shouldShowBillingDetails && (
              <p className="text-xs text-center text-muted-foreground">
                Upgrade to unlock more features and save your work
              </p>
            )}

            {shouldShowBillingDetails && (
              <div className="px-4 inline-flex items-center gap-2 text-xs text-center text-muted-foreground">
                <RiInformationLine className="h-4 w-4" />{" "}
                <p>
                  Tip: Use the Customer Portal to update your payment method,
                  download invoices, or make changes to your plan.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
