"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VoxenLogo } from "./VoxenLogo";
import { WalletButton } from "@/components/wallet/WalletButton";
import { ThemeToggle } from "./ThemeToggle";
export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const links = [
    ["/explore", "Explore"],
    ["/communities", "Communities"],
    ["/live-proof", "Proof"],
  ] as const;
  return (
    <header className="site-header">
      <div className="nav-shell">
        <VoxenLogo />
        <button
          className="nav-menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">{open ? "Close" : "Open"} navigation</span>
          <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
        </button>
        <nav
          id="main-navigation"
          className={open ? "menu-open" : ""}
          aria-label="Main navigation"
        >
          {links.map(([href, label]) => (
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
            </Link>
          ))}
          <Link href="/create" className="nav-mobile-create">Create proposal</Link>
        </nav>
        <div className="nav-actions">
          <Link href="/create" className="button primary nav-create">
            Create proposal
          </Link>
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
