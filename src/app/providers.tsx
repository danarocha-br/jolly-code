"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "react-query";
import Script from "next/script";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

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
          {children}
          <Toaster position="top-center" theme="light" richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}
