"use client";
import { useVotingClock } from "@/hooks/useVotingClock";
import { votingState, scheduleLabel } from "@/lib/voxen/lifecycle";
import { GovernanceReview } from "./GovernanceReview";
import { SupportingReference } from "./SupportingReference";
import Link from "next/link";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { VoteController } from "@/hooks/useVoxenVote";
import type { LiveProposal } from "@/lib/voxen/reads";
import type { ReactNode } from "react";
import { StatusBadge, EligibilityBadge } from "@/components/governance/Badges";
import { AddressDisplay } from "@/components/governance/AddressDisplay";
import { LifecycleTimeline } from "@/components/proposals/LifecycleTimeline";
import { EligibilityPanel } from "@/components/proposals/EligibilityPanel";
import { VotingPanel } from "@/components/proposals/VotingPanel";

import type { Proposal, Community } from "@/types/voxen";
const date = (s: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(s)) + " UTC";
export function ProposalDetails({
  p,
  space,
  liveState,
  eligibilityCheck,
  voting,
}: {
  p: Proposal;
  space?: Community;
  liveState?: ReactNode;
  eligibilityCheck?: EligibilityCheck;
  voting?: VoteController;
}) {
  const now = useVotingClock();
  const state = votingState(p, now);
  return (
    <main id="main" className="shell proposal-page">
      <Link href="/explore" className="back-link">← Back to Explore</Link>
      <header className="proposal-heading">
        <div className="card-tags">
          <StatusBadge status={state} />
          {space ? <Link className="proposal-community" href={`/communities/${space.id}`}>{space.name}</Link> : p.communityId ? <Link className="proposal-community" href={`/communities/${p.communityId}`}>Community {p.communityId}</Link> : <span className="proposal-community">Public proposal</span>}
        </div>
        <h1>{p.title}</h1>
        <p className="proposal-lede">{p.description}</p>
        <div className="proposal-byline">
          <span>Proposed by</span>
          <AddressDisplay address={p.creator} compact />
          <span>Proposal <code>#{p.id}</code></span>
        </div>
        <div className="proposal-deadlines"><div><span>Opens</span><strong>{date(p.startsAt)}</strong></div><div><span>Closes</span><strong>{date(p.endsAt)}</strong></div><div><span>Current state</span><strong>{scheduleLabel(p, now)}</strong></div></div>
      </header>
      <section className="decision-cockpit" aria-label="Proposal decision cockpit">
        <div className="cockpit-vote">
          <EligibilityPanel
            eligibility={p.eligibility}
            live={p.source === "live"}
            check={eligibilityCheck}
          />
          <VotingPanel proposal={p} voting={voting} eligibilityCheck={eligibilityCheck} />
        </div>
        <aside className="cockpit-state">
          {liveState}
          <LifecycleTimeline proposal={p} />
        </aside>
      </section>
      <section className="proposal-context" aria-label="Proposal context">
        <section className="panel proposal-description-panel">
          <h2>Proposal context</h2>
          <p>{p.description}</p>
          {p.evidenceUrl && <SupportingReference url={p.evidenceUrl} />}
        </section>
        <div className="proposal-context-grid">
          <section className="panel voting-rules-panel">
            <h2>Voting rules</h2>
            <dl className="voting-rules-list">
              <div className="voting-rule-row"><dt>Eligibility</dt><dd><EligibilityBadge eligibility={p.eligibility} /></dd></div>
              <div className="voting-rule-row"><dt>Vote policy</dt><dd>{p.voteChangePolicy === "FINAL_ON_CAST" ? "One final vote per wallet" : "Changes allowed until close"}</dd></div>
              <div className="voting-rule-row"><dt>Results</dt><dd>{p.resultVisibility === "LIVE" ? "Visible while voting is open" : "Hidden until voting closes"}</dd></div>
            </dl>
          </section>
          <GovernanceReview p={p} space={space} />
        </div>
        <details className="technical-details"><summary>Technical proposal parameters</summary>
          <dl className="technical-parameters-grid"><div className="technical-parameter"><dt>Starts</dt><dd>{date(p.startsAt)}</dd></div><div className="technical-parameter"><dt>Ends</dt><dd>{date(p.endsAt)}</dd></div><div className="technical-parameter"><dt>Proposal ID</dt><dd><code>{p.id}</code></dd></div></dl>
          {p.eligibility.mode === "POAP_NFT" && <dl className="metadata-grid"><div><dt>Credential contract</dt><dd><AddressDisplay address={p.eligibility.contract} /></dd></div><div><dt>Chain / token ID</dt><dd><code>{p.eligibility.chainId} / {p.eligibility.tokenId || "Not specified"}</code></dd></div></dl>}
        </details>
      </section>
    </main>
  );
}
