import type { PlanId } from "@/lib/config/plans";
import type { BillingInfo, PaymentMethodInfo, InvoiceInfo } from "@/lib/services/billing";

export type BillingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type BillingState = {
  isUpgradeOpen: boolean;
  isDowngradeOpen: boolean;
  isPending: boolean;
};

export type BillingActions = {
  setIsUpgradeOpen: (open: boolean) => void;
  setIsDowngradeOpen: (open: boolean) => void;
  handleOpenPortal: () => void;
};

// Re-export types for convenience
export type {
  BillingInfo,
  PaymentMethodInfo,
  InvoiceInfo,
};

