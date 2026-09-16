"use client";
import { useVotingClock } from "@/hooks/useVotingClock";
import { votingState, scheduleLabel } from "@/lib/voxen/lifecycle";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import type { Proposal } from "@/types/voxen";
import {
  StatusBadge,
  EligibilityBadge,
  GovernanceGuardBadge,
} from "@/components/governance/Badges";
export function ProposalCard({ proposal: p }: { proposal: Proposal; index?: number }) {
  const now = useVotingClock();
  const state = votingState(p, now);
  const hidden = Boolean(p.talliesHidden);
  const totalVotes = p.options.reduce((total, option) => total + option.votes, 0);
  const leading = !hidden && totalVotes > 0 ? [...p.options].sort((a, b) => b.votes - a.votes)[0] : undefined;
  const leadingPercent = leading ? Math.round((leading.votes / totalVotes) * 100) : 0;
  const deadline = scheduleLabel(p, now);
  const opensIn = Math.max(0, Date.parse(p.startsAt) - now);
  const eligibility = p.eligibility.mode === "PUBLIC" ? "PUBLIC" : p.eligibility.mode.startsWith("POAP") ? "POAP ELIGIBLE" : "ELIGIBILITY GATED";
  return (
    <Link href={`/proposals/${p.id}`} className={`proposal-card proposal-card-${state.toLowerCase()}`} aria-label={`Review proposal ${p.id}: ${p.title}`}>
      <div className="proposal-card-top">
        <StatusBadge status={state} />
        <span className="proposal-deadline">{deadline}</span>
      </div>
      <h3 title={p.title}>{p.title}</h3>
      <p className="proposal-description">{p.description}</p>
      <div className="card-tags">
        <span className="proposal-eligibility">{eligibility}</span>
        <span className="proposal-identity">{p.communityId || "Public proposal"}</span>
      </div>
      <div className={`proposal-result${hidden ? " is-hidden" : ""}`}>
        {hidden ? <><LockKeyhole aria-hidden="true" size={16} /><div><strong>Results locked</strong><span>Available after voting closes</span></div></> : state === "UPCOMING" ? <><div><strong>Opens in {formatCountdown(opensIn)}</strong><span>{new Date(p.startsAt).toLocaleString()}</span></div></> : state === "ENDED" ? <><div><strong>Voting closed</strong><span>Awaiting final handling</span></div></> : state === "REVIEW" ? <><div><strong>Governance Review</strong><span>{p.guard?.outcome.replaceAll("_", " ").toLowerCase() || "In progress"}</span></div></> : state === "FINALIZED" ? <><div><strong>{p.result === "TIED" ? "Tied result" : p.result ? `Winner: ${p.result}` : "Finalized"}</strong><span>{p.participation} total participants</span></div></> : <><div className="proposal-result-copy"><strong>{leading ? `Leading: ${leading.label}` : "Voting live"}</strong><span>{p.participation} total participants</span></div><span className="proposal-percent">{leading ? `${leadingPercent}%` : "—"}</span><span className="proposal-progress"><i style={{ width: `${leadingPercent}%` }} /></span></>}
      </div>
      <div className="card-foot"><span>#{p.id} · {shortAddress(p.creator)}</span><span className="proposal-review-action">Review proposal <ArrowRight aria-hidden="true" size={14} /></span></div>
    </Link>
  );
}

function shortAddress(value: string) {
  return value.length > 13 ? `${value.slice(0, 7)}…${value.slice(-4)}` : value;
}

function formatCountdown(milliseconds: number) {
  const minutes = Math.ceil(milliseconds / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
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
