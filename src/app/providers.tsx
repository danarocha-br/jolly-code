"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Script from "next/script";
import { QueryClientProvider, HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";

export function Providers({ children, state }: { children: React.ReactNode; state?: DehydratedState }) {
  const queryClient = getQueryClient();

  return (
    <>
      <Script
        id="HotJarAnalyticsScript"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:3685639,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`,
        }}
      />
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
