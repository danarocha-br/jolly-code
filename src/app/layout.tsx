import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";

import { Sen } from "next/font/google";
import { Providers } from "./providers";
import { CSPostHogProvider } from "@/lib/posthog";
import { SessionSync } from "@/components/session-sync";
import { siteConfig } from "@/lib/utils/site-config";

const sen = Sen({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  authors: siteConfig.authors,
  keywords: siteConfig.keywords,
  creator: "Dana Rocha",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jollycode.dev",
    siteName: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.imageUrl,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.imageUrl],
    creator: "@danarocha_",
  },
  icons: {
    icon: ["./favicon.ico"],
  },
};

import { dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";
import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const supabase = await createClient();
  await queryClient.prefetchQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });

  const user = queryClient.getQueryData<{ id: string; email?: string; user_metadata?: any } | null>(["user"]);

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.15.1/devicon.min.css"
        />
      </head>
      <body className={sen.className}>
        <CSPostHogProvider user={user}>
          <SessionSync user={user as any} />
          <Providers state={dehydrate(queryClient)}>{children}</Providers>
        </CSPostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
