"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      {children}
      <Toaster position="top-center" theme='light' richColors />
    </ThemeProvider>
  );
}
