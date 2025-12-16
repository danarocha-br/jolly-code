"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { USAGE_QUERY_KEY } from "@/features/user/queries";

export function PortalReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // Ref to prevent double-firing in strict mode
  const handledRef = useRef(false);

  useEffect(() => {
    const action = searchParams?.get("stripe_action");

    if (action === "portal_return" && !handledRef.current) {
      handledRef.current = true;

      // Sync subscription data directly from Stripe first to ensure we have the latest data
      // This is important because webhooks might not have processed yet when user returns
      const syncSubscription = async () => {
        try {
          const { syncSubscription: syncSub } = await import(
            "@/actions/stripe/checkout"
          );
          await syncSub({});

          // After syncing with Stripe, refetch queries to get the updated data
          queryClient.refetchQueries({ queryKey: ["billing-info"] });
          queryClient.refetchQueries({ queryKey: [USAGE_QUERY_KEY] });
          queryClient.refetchQueries({ queryKey: ["user"] }); // Refresh user menu/avatar if needed
        } catch (error) {
          console.error("Failed to sync subscription:", error);
          // Fallback to just refetching if sync fails
          queryClient.refetchQueries({ queryKey: ["billing-info"] });
          queryClient.refetchQueries({ queryKey: [USAGE_QUERY_KEY] });
          queryClient.refetchQueries({ queryKey: ["user"] });
        }
      };

      syncSubscription();

      // Show feedback
      toast.success("Subscription updated", {
        description: "Your billing information has been refreshed.",
      });

      // Remove query param from URL without refreshing
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stripe_action");

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router, pathname, queryClient]);

  return null;
}
