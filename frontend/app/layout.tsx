import type { Metadata, Viewport } from "next";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Script from "next/script";
export const metadata: Metadata = {
  title: {
    default: "Voxen — Decisions, governed by consensus.",
    template: "%s | Voxen",
  },
  description:
    "Eligibility-gated governance and rule-aware decisions, built on GenLayer.",
  icons: { icon: "/favicon.svg" },
  manifest: "/site.webmanifest",
};
export const viewport: Viewport = { themeColor: "#f6f5f0" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-preference" strategy="beforeInteractive">{`try { const saved = localStorage.getItem('voxen-theme'); const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; } catch {}`}</Script>
      </head>
      <body>
        <Providers>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
