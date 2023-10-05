import "./globals.css";
import "remixicon/fonts/remixicon.css";

import type { Metadata } from "next";
import { Sen } from "next/font/google";
import { Providers } from "./providers";

const sen = Sen({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JollyCode",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={sen.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
