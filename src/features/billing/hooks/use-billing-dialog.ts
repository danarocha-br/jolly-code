import { useState, useTransition } from "react";
import { useUserStore } from "@/app/store";
import { createPortalSession } from "@/actions/stripe/checkout";
import { toast } from "sonner";
import { useUserPlan } from "@/features/user/queries";
import { getDowngradeTarget } from "@/lib/utils/downgrade-impact";
import type { PlanId } from "@/lib/config/plans";

export const useBillingDialog = () => {
  const { user } = useUserStore();
  const userId = user?.id;
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isDowngradeOpen, setIsDowngradeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { data: planData } = useUserPlan(userId);
  const currentPlan: PlanId | undefined =
    planData && ["free", "starter", "pro"].includes(planData as string)
      ? (planData as PlanId)
      : undefined;

  const downgradeTarget = currentPlan ? getDowngradeTarget(currentPlan) : null;

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

  return {
    // State
    userId,
    isUpgradeOpen,
    isDowngradeOpen,
    isPending,
    currentPlan,
    downgradeTarget,

    // Actions
    setIsUpgradeOpen,
    setIsDowngradeOpen,
    handleOpenPortal,
  };
};

