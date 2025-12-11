"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { USAGE_QUERY_KEY } from "@/features/user/queries";

type CheckoutSuccessClientProps = {
  plan: string;
  sessionId: string;
};

export function CheckoutSuccessClient({
  plan,
  sessionId,
}: CheckoutSuccessClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate user usage cache to force refetch with new plan
    queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ["user-plan"] });

    // Show success toast
    toast.success(`Subscription activated!`, {
      description: `Your ${plan} subscription is now active.`,
      duration: 5000,
    });

    // Redirect to home after a brief delay
    const redirectTimer = setTimeout(() => {
      router.push("/");
    }, 1500);

    return () => clearTimeout(redirectTimer);
  }, [plan, sessionId, router, queryClient]);

  // Show minimal loading state while redirecting
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
