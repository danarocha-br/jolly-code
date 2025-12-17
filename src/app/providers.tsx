"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClientProvider, DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";
import { PortalReturnHandler } from "@/features/billing/components/portal-return-handler";
import { AuthProvider } from "@/components/auth-provider";

export function Providers({ children, state }: { children: React.ReactNode; state?: DehydratedState }) {
  const queryClient = getQueryClient();

  return (
    <>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <QueryClientProvider client={queryClient}>
          <HydrationBoundary state={state}>
            <AuthProvider>
              <PortalReturnHandler />
              {children}
              <Toaster position="top-center" theme="light" richColors />
            </AuthProvider>
          </HydrationBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
