"use client";
import { useVotingClock } from "@/hooks/useVotingClock";
import { votingState, scheduleLabel } from "@/lib/voxen/lifecycle";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Proposal } from "@/types/voxen";
import {
  StatusBadge,
  EligibilityBadge,
  GovernanceGuardBadge,
} from "@/components/governance/Badges";
export function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const now = useVotingClock();
  const state = votingState(p, now);
  return (
    <Link href={`/proposals/${p.id}`} className="proposal-card">
      <div className="row">
        <StatusBadge status={state} />
        <ArrowUpRight size={17} />
      </div>
      <h3>{p.title}</h3>
      <p className="small">
        {p.communityId || "Public proposal"}
      </p>
      <p>{p.description}</p>
      <p>{scheduleLabel(p, now)}</p>
      <p className="small">Starts {new Date(p.startsAt).toLocaleString()} · Ends {new Date(p.endsAt).toLocaleString()}</p>
      {p.result && <p>Final result: {p.result}</p>}
      {state === "ENDED" && <p>{p.talliesHidden ? "Tally unavailable" : p.options.map((o) => `${o.label}: ${o.votes}`).join(" · ")} · Awaiting finalization</p>}
      <div className="card-tags">
        <EligibilityBadge eligibility={p.eligibility} />
        <GovernanceGuardBadge review={p.guard} />
      </div>
      <div className="card-foot">
        <span>{p.participation} participants</span>
        <span>{state === "LIVE" ? "View & vote" : "View proposal"}</span>
      </div>
    </Link>
  );
}
export function ProposalNode({ proposal }: { proposal: Proposal }) {
  return (
    <Link href={`/proposals/${proposal.id}`} className="proposal-node">
      <div className="row">
        <span className="eyebrow">
          {proposal.communityId || "Public proposal"}
        </span>
        <StatusBadge status={proposal.status} />
      </div>
      <h3>{proposal.title}</h3>
      <div className="proposal-node-metadata">
        <EligibilityBadge eligibility={proposal.eligibility} />
        <GovernanceGuardBadge review={proposal.guard} />
      </div>
      <div className="proposal-node-footer">
        <span>{proposal.participation} participants</span>
        <ArrowUpRight size={15} />
      </div>
    </Link>
  );
}
