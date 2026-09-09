"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoxenLogo } from "./VoxenLogo";
import { WalletButton } from "@/components/wallet/WalletButton";
export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-shell">
        <VoxenLogo />
        <button
          className="button menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          Menu {open ? "−" : "+"}
        </button>
        <nav
          id="main-navigation"
          className={open ? "menu-open" : ""}
          aria-label="Main navigation"
        >
          {[
            ["/explore", "Explore"],
            ["/spaces", "Spaces"],
            ["/create", "Create Proposal"],
            ["/create-space", "Create Space"],
            ["/live-proof", "Live Proof"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                path === href || path.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
            >
              {label}
              {href === "/live-proof" && <span className="dot" />}
            </Link>
          ))}
        </nav>
        <WalletButton />
        <span className="mobile-route">
          {path.startsWith("/proposals/")
            ? "Proposal"
            : path.startsWith("/spaces/")
              ? "Space details"
              : (
                  {
                    "/": "Home",
                    "/explore": "Explore",
                    "/spaces": "Spaces",
                    "/create": "Create Proposal",
                    "/create-space": "Create Space",
                    "/live-proof": "Live Proof",
                  } as Record<string, string>
                )[path]}
        </span>
      </div>
    </header>
  );
}
