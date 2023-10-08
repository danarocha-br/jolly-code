"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" theme="light" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
