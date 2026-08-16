import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

import { Providers } from "./providers";

// HeroUI Pro theme's font — see globals.css "HeroUI Pro Theme" block.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Operatora",
    template: "%s · Operatora",
  },
  description: "Operatora workspace.",
};

// Colors the browser chrome (Chrome's tab bar/toolbar on Android, PWA
// splash background) — matches the theme's own light/dark --background
// values (globals.css "HeroUI Pro Theme" block), not an arbitrary color, so
// it can't drift out of sync if the theme is retuned later.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#090503" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
