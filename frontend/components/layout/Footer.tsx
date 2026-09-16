import { VoxenLogo } from "./VoxenLogo";
import Link from "next/link";
import { voxenConfig } from "@/lib/voxen/config";
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-shell shell">
      <div className="footer-brand">
        <VoxenLogo />
        <p>Clear proposals, eligible participation, and decisions anyone can trace.</p>
      </div>
      <div className="footer-links" aria-label="Product navigation">
        <span className="footer-label">Product</span>
        <Link href="/explore">Explore proposals</Link>
        <Link href="/communities">Communities</Link>
        <Link href="/create">Create a proposal</Link>
        <Link href="/live-proof">Proof</Link>
      </div>
      <div className="footer-network">
        <span className="footer-label"><i className="live-dot" /> Network</span>
        <span>Studio Next active</span>
        <span>{voxenConfig.networkName} · Chain {voxenConfig.chainId}</span>
        <code title={voxenConfig.contract} aria-label={`Active contract ${voxenConfig.contract}`}>{voxenConfig.contract.slice(0, 10)}…{voxenConfig.contract.slice(-6)}</code>
      </div>
      <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Voxen</span>
          <span>Transparent consensus, with proof.</span>
        </div>
      </div>
    </footer>
  );
}
