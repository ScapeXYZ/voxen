import Link from "next/link";
import { notFound } from "next/navigation";
import { voxenData } from "@/lib/voxen/data";
import { StatusBadge, EligibilityBadge } from "@/components/governance/Badges";
import { AddressDisplay } from "@/components/governance/AddressDisplay";
import { LifecycleTimeline } from "@/components/proposals/LifecycleTimeline";
import { EligibilityPanel } from "@/components/proposals/EligibilityPanel";
import { VotingPanel } from "@/components/proposals/VotingPanel";
import { LiveProofPanel } from "@/components/governance/LiveProofPanel";
const date = (s: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(s)) + " UTC";
export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "proposal-3")
    return (
      <main id="main" className="shell page">
        <Link href="/live-proof" className="eyebrow">
          ← BRADBURY PROOF
        </Link>
        <h1>Voxen ERC1155 Holder Vote Proof</h1>
        <p>
          Recorded testnet result. Current lifecycle and wallet eligibility have
          not been queried.
        </p>
        <LiveProofPanel full />
      </main>
    );
  const p = await voxenData.getProposal(id);
  if (!p) notFound();
  const space = p.spaceId ? await voxenData.getSpace(p.spaceId) : undefined;
  return (
    <main id="main" className="shell page">
      <Link href="/explore" className="eyebrow">
        ← EXPLORE GOVERNANCE
      </Link>
      <div className="proposal-heading">
        <div className="card-tags">
          <StatusBadge status={p.status} />
          {space && <Link href={`/spaces/${space.id}`}>{space.name} ↗</Link>}
        </div>
        <h1>{p.title}</h1>
        <div className="row start">
          <span className="muted">Proposed by</span>
          <AddressDisplay address={p.creator} compact />
        </div>
      </div>
      <div className="demo-notice">
        Sample proposal · All review, participation, and results below are
        illustrative.
      </div>
      <p className="voting-window">
        Voting opens {date(p.startsAt)} · Voting closes {date(p.endsAt)}
      </p>
      <div className="voter-summary">
        <EligibilityPanel eligibility={p.eligibility} />
        <VotingPanel proposal={p} />
      </div>
      <LifecycleTimeline proposal={p} />
      <div className="proposal-context">
        <div>
          <section className="panel">
            <span className="eyebrow">THE PROPOSAL</span>
            <h2>What is being decided?</h2>
            <p className="proposal-description">{p.description}</p>
            {p.evidenceUrl && (
              <a
                className="text-link"
                href={p.evidenceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View supporting evidence ↗
              </a>
            )}
          </section>
          <section className="panel">
            <div className="row">
              <h3>Governance Guard</h3>
              {p.guard && <StatusBadge status={p.guard.outcome} />}
            </div>
            <p className="small">
              Governance Guard compares this proposal with the Space’s rules and
              uses validator consensus to produce a review.
            </p>
            {p.guard && (
              <p>
                {p.guard.outcome === "COMPLIANT"
                  ? "Matches the Space’s governance rules."
                  : p.guard.outcome === "NEEDS_REVIEW"
                    ? "May need human review before proceeding."
                    : "Conflicts with one or more Space rules."}
              </p>
            )}
            {p.guard ? (
              <>
                <p>{p.guard.reason}</p>
                <div className="review-metrics">
                  <div>
                    <span>Risk</span>
                    <strong>{p.guard.risk}</strong>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <strong>{p.guard.confidence}%</strong>
                  </div>
                </div>
                <h4>Evidence consistency</h4>
                <p>{p.guard.evidenceConsistency}</p>
                <p className="small muted">
                  Sample validator review ·{" "}
                  {space?.nonCompliantPolicy === "BLOCK"
                    ? "Non-compliant proposals are blocked."
                    : "Non-compliant proposals receive a warning."}
                </p>
              </>
            ) : (
              <p className="muted">
                Governance Guard is not enabled for this proposal.
              </p>
            )}
          </section>
          <section className="panel">
            <h3>Voting parameters</h3>
            <dl className="metadata-grid">
              <div>
                <dt>Starts</dt>
                <dd>{date(p.startsAt)}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{date(p.endsAt)}</dd>
              </div>
              <div>
                <dt>Vote change policy</dt>
                <dd>
                  {p.voteChangePolicy === "FINAL_ON_CAST"
                    ? "Cannot change after submission"
                    : "Can change until voting closes"}
                </dd>
              </div>
              <div>
                <dt>Result visibility</dt>
                <dd>
                  {p.resultVisibility === "LIVE"
                    ? "Live results"
                    : "Hidden until voting closes"}
                </dd>
              </div>
            </dl>
            <EligibilityBadge eligibility={p.eligibility} />
            {p.eligibility.mode === "POAP_NFT" && (
              <details>
                <summary>Technical details</summary>
                <dl>
                  <dt>Credential contract</dt>
                  <dd>
                    <AddressDisplay address={p.eligibility.contract} />
                  </dd>
                  <dt>Chain / token ID</dt>
                  <dd>
                    {p.eligibility.chainId} /{" "}
                    {p.eligibility.tokenId || "Not specified"}
                  </dd>
                  <dt>Display label</dt>
                  <dd>{p.eligibility.label}</dd>
                </dl>
              </details>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
