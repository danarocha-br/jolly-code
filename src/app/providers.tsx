"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClientProvider, HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";

export function Providers({ children, state }: { children: React.ReactNode; state?: DehydratedState }) {
  const queryClient = getQueryClient();

  return (
    <>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <QueryClientProvider client={queryClient}>
          <HydrationBoundary state={state}>
            {children}
            <Toaster position="top-center" theme="light" richColors />
          </HydrationBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
