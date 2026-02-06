"use client";

import { BillingFeature } from "@/features/billing";

type BillingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BillingDialog(props: BillingDialogProps) {
  return <BillingFeature {...props} />;
}
