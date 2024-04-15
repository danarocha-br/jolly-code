import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";

import { Sen } from "next/font/google";
import { Providers } from "./providers";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.15.1/devicon.min.css"
        />
      </head>
      <body className={sen.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
