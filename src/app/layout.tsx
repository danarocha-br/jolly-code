import "./globals.css";
import "remixicon/fonts/remixicon.css";

import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";

import { Sen } from "next/font/google";
import { Providers } from "./providers";

const sen = Sen({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jolly Code",
  description:
    "Beautify, share, and improve your code. A multi-language, visually-appealing code sharing platform.",
  authors: [
    {
      name: "Dana Rocha",
      url: "https://bento.me/danarocha",
    },
  ],

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jollycode.dev",
    siteName: "Jolly Code",
    description:
      "Beautify, share, and improve your code. A multi-language, visually-appealing code sharing platform.",
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
