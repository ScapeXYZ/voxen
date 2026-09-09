import { VoxenLogo } from "./VoxenLogo";
import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer shell">
      <div>
        <VoxenLogo />
        <p>Decisions, governed by consensus.</p>
      </div>
      <div className="footer-links">
        <Link href="/explore">Explore the network ↗</Link>
        <Link href="/communities">Communities ↗</Link>
        <Link href="/live-proof">Live Proof ↗</Link>
        <span>Built on GenLayer</span>
        <details>
          <summary>Bradbury Testnet</summary>
          <p>
            Testnet environment used to demonstrate Voxen before production
            deployment.
          </p>
        </details>
        <span>Independent project.</span>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Voxen</span>
        <span>Shared intent. Verifiable outcomes.</span>
      </div>
    </footer>
  );
}
