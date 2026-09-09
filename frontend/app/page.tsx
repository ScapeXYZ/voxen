import Link from "next/link";
import {
  ArrowUpRight,
  Fingerprint,
  Shield,
  GitBranch,
  ScanLine,
  ArrowRight,
  Coins,
} from "lucide-react";
import { GovernanceGraph } from "@/components/governance/GovernanceGraph";
import { LiveProofPanel } from "@/components/governance/LiveProofPanel";
export default function Home() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-kicker">
          <span className="eyebrow">
            <span className="dot" /> THE NEXT CHAPTER OF COLLECTIVE DECISIONS
          </span>
          <span className="network-label">
            BUILT ON GENLAYER <ArrowUpRight size={12} />
          </span>
        </div>
        <div className="hero-heading">
          <h1>
            Decisions, governed
            <br />
            by <span>consensus.</span>
          </h1>
          <div className="hero-copy">
            <p>
              Browse public proposals without joining a Community. Connect your wallet to check eligibility and vote. Community workspaces unlock separately for whitelisted wallets.
            </p>
            <div className="actions">
              <Link href="/explore" className="button primary">
                Explore proposals <ArrowUpRight size={16} />
              </Link>
              <Link href="/create" className="text-link">
                Create a proposal <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
        <ul className="trust-strip" aria-label="Voxen features">
          <li>Eligibility-gated voting</li>
          <li>One wallet, one vote</li>
          <li>Governance Guard</li>
          <li>GenLayer consensus</li>
        </ul>
        <GovernanceGraph />
        <div className="hero-caption">
          <span>A better way to move forward, together.</span>
          <span>
            PUBLIC VOTING <i /> VERIFIED PARTICIPATION <i /> SHARED
            DECISIONS
          </span>
        </div>
      </section>
      <section className="why-section">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">01 / WHY VOXEN</span>
            <h2>
              Good governance is
              <br />
              more than a vote.
            </h2>
            <p>
              From the first proposal to the final outcome,
              <br />
              every step deserves a little more clarity.
            </p>
          </div>
          <div className="feature-grid">
            {[
              {
                icon: Fingerprint,
                title: "The right to participate.",
                text: "Every vote is eligibility-gated. Verify GEN holdings or community credentials, with one wallet equal to one vote.",
              },
              {
                icon: Shield,
                title: "Your rules, in the loop.",
                text: "Give your Community a constitution. Governance Guard reviews proposals against the principles your community sets.",
              },
              {
                icon: GitBranch,
                title: "Consensus over opinion.",
                text: "Independent GenLayer validators review proposals to reach a shared assessment of compliance.",
              },
              {
                icon: ScanLine,
                title: "Decisions you can trace.",
                text: "Follow a proposal from draft to finalization, with clear policies, participation, and outcomes.",
              },
            ].map((f, i) => (
              <article key={f.title}>
                <div className="feature-top">
                  <f.icon size={23} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="participation" className="shell eligibility-section">
        <div>
          <span className="eyebrow">02 / VERIFIED PARTICIPATION</span>
          <h2>
            A seat at the table.
            <br />A clear way in.
          </h2>
          <p>
            Open to communities of every kind.
            <br />
            Always grounded in verified eligibility.
          </p>
          <span className="small muted">
            No public voting. No token-weighted influence.
          </span>
        </div>
        <div className="eligibility-cards">
          <article>
            <Coins size={22} />
            <h3>Hold GEN. Have a voice.</h3>
            <p>
              Creators set a minimum GEN balance. Holding establishes
              eligibility — no locking, participation fee, or token transfer.
            </p>
            <span className="mono">
              GEN holding <ArrowUpRight size={15} />
            </span>
          </article>
          <article>
            <Fingerprint size={22} />
            <h3>Your credential is your key.</h3>
            <p>
              Use an ERC721 or ERC1155 NFT / POAP credential to recognize the
              people who belong in the decision.
            </p>
            <span className="mono">
              NFT / POAP credential <ArrowUpRight size={15} />
            </span>
          </article>
        </div>
      </section>
      <section id="governance-guard" className="guard-section">
        <div className="shell">
          <div className="guard-heading">
            <div>
              <span className="eyebrow">03 / GOVERNANCE GUARD</span>
              <h2>
                Shared principles.
                <br />
                Independent perspective.
              </h2>
            </div>
            <div>
              <p>
                Turn your constitution into a practical part of governance.
                GenLayer validator consensus assesses alignment, risk, and
                evidence before a decision moves forward.
              </p>
              <Link href="/create-community" className="text-link">
                Build your Community <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="guard-flow">
            {[
              "Your constitution",
              "A community proposal",
              "Validator review",
              "An informed decision",
            ].map((x, i) => (
              <div key={x}>
                <span className="mono">0{i + 1}</span>
                <h3>{x}</h3>
                <p>
                  {
                    [
                      "Define the principles.",
                      "Put an idea forward.",
                      "Assess rules and evidence.",
                      "Compliant, needs review, or non-compliant.",
                    ][i]
                  }
                </p>
                {i < 3 && <ArrowRight size={18} />}
              </div>
            ))}
          </div>
          <div className="guard-note">
            <Shield size={16} />
            <span>
              Your Community chooses whether non-compliant proposals are blocked or
              flagged. Ties remain tied. No AI tie-breaking.
            </span>
          </div>
        </div>
      </section>
      <section className="shell proof-section">
        <LiveProofPanel />
      </section>
      <section className="closing shell">
        <span className="eyebrow">YOUR COMMUNITY. YOUR NEXT CHAPTER.</span>
        <h2>Make room for better decisions.</h2>
        <Link href="/create-community" className="button primary">
          Create a Community <ArrowUpRight size={16} />
        </Link>
      </section>
    </main>
  );
}
