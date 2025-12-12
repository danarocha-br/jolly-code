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
            console.log("[PortalReturnHandler] Detected return from Stripe Portal, refreshing data...");

            // Invalidate queries to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ["billing-info"] });
            queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ["user"] }); // Refresh user menu/avatar if needed

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
