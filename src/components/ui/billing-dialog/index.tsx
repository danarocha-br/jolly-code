"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BillingInfo } from "./components/billing-info";
import { PaymentMethod } from "./components/payment-method";
import { InvoiceList } from "./components/invoice-list";
import { useBillingInfo, usePaymentMethod, useInvoices } from "@/features/billing/queries";
import { useUserStore } from "@/app/store";
import { createPortalSession } from "@/actions/stripe/checkout";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { useUserPlan } from "@/features/user/queries";

type BillingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BillingDialog({ open, onOpenChange }: BillingDialogProps) {
  const { user } = useUserStore();
  const userId = user?.id;
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { data: billingInfo, isLoading: isBillingLoading, error: billingError } = useBillingInfo(userId);
  const hasSubscription = Boolean(billingInfo?.stripeCustomerId);
  const { data: paymentMethod, isLoading: isPaymentLoading, error: paymentError } = usePaymentMethod(
    hasSubscription ? billingInfo?.stripeCustomerId || undefined : undefined
  );
  const { data: invoices, isLoading: isInvoicesLoading, error: invoicesError } = useInvoices(
    hasSubscription ? billingInfo?.stripeCustomerId || undefined : undefined
  );
  const { data: currentPlan } = useUserPlan(userId);

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

  return (
    <>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        currentPlan={currentPlan || "free"}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Badge variant="outline" className="w-fit mb-2">
              Billing & Subscription
            </Badge>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              View your current plan, payment method, and invoice history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {billingError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                Failed to load billing information. Please try again.
              </div>
            )}

            <BillingInfo
              billingInfo={billingInfo || null}
              isLoading={isBillingLoading}
            />

            {hasSubscription && (
              <>
                {paymentError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to load payment method.
                  </div>
                )}
                <PaymentMethod
                  paymentMethod={paymentMethod || null}
                  isLoading={isPaymentLoading}
                />

                {invoicesError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    Failed to load invoices.
                  </div>
                )}
                <InvoiceList
                  invoices={invoices || []}
                  isLoading={isInvoicesLoading}
                />
              </>
            )}

            <Separator />

            <div className="flex flex-col gap-3">
              {hasSubscription ? (
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
              ) : (
                <Button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  Upgrade Plan
                </Button>
              )}

              {!hasSubscription && (
                <p className="text-xs text-center text-muted-foreground">
                  Upgrade to unlock more features and save your work
                </p>
              )}

              {hasSubscription && (
                <p className="text-xs text-center text-muted-foreground">
                  Use the Customer Portal to update your payment method, view
                  invoices, and manage your subscription
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

