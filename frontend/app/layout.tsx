import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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
    <html lang="en">
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
