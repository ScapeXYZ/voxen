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
    <main id="main" className="shell page">
      <Link href="/explore" className="eyebrow">
        ← EXPLORE GOVERNANCE
      </Link>
      <div className="proposal-heading">
        <div className="card-tags">
          <StatusBadge status={state} />
          {space ? <Link href={`/communities/${space.id}`}>{space.name} ↗</Link> : p.communityId ? <Link href={`/communities/${p.communityId}`}>Community {p.communityId} ↗</Link> : null}
        </div>
        <h1>{p.title}</h1>
        <div className="row start">
          <span className="muted">Proposed by</span>
          <AddressDisplay address={p.creator} compact />
        </div>
      </div>
      <p role="status">{scheduleLabel(p, now)}</p>
      {state === "ENDED" && <p>Voting has ended. Final result has not yet been finalized.</p>}
      {liveState}
      <p className="voting-window">
        Voting opens {date(p.startsAt)} · Voting closes {date(p.endsAt)}
      </p>
      <div className="voter-summary">
        <EligibilityPanel
          eligibility={p.eligibility}
          live={p.source === "live"}
          check={eligibilityCheck}
        />
        <VotingPanel
          proposal={p}
          voting={voting}
          eligibilityCheck={eligibilityCheck}
        />
      </div>
      <LifecycleTimeline proposal={p} />
      <div className="proposal-context">
        <div>
          <section className="panel">
            <span className="eyebrow">THE PROPOSAL</span>
            <h2>What is being decided?</h2>
            <p className="proposal-description">{p.description}</p>
            {p.evidenceUrl && <SupportingReference url={p.evidenceUrl} />}
          </section>
          <GovernanceReview p={p} space={space} />
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
                  ? "Your vote is final once submitted"
                    : "You can change your vote until voting closes"}
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
                  <dt>Credential type</dt>
                  <dd>{p.eligibility.standard}</dd>
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
