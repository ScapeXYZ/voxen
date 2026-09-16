"use client";
import type { Proposal } from "@/types/voxen";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";
export function LifecycleTimeline({ proposal }: { proposal: Proposal }) {
  const state = votingState(proposal, useVotingClock());
  const stages = ["UPCOMING", "LIVE", "ENDED", "FINALIZED"] as const;
  const labels = ["Upcoming", "Voting", "Ended", "Finalized"];
  const current = stages.indexOf(state as (typeof stages)[number]);
  return <section className="lifecycle-panel" aria-labelledby="lifecycle-heading"><div className="panel-heading"><div><h2 id="lifecycle-heading">Decision lifecycle</h2><p>{proposal.guardRequired ? "Governance Review is required before the voting lifecycle can proceed." : "Follow the proposal from schedule to recorded outcome."}</p></div></div><ol className="lifecycle">{stages.map((s, i) => <li key={s} className={i < current ? "reached" : i === current ? "current" : ""} aria-current={s === state ? "step" : undefined}><span className="lifecycle-marker" aria-hidden="true">{i < current ? "✓" : i + 1}</span><div className="lifecycle-copy"><strong>{labels[i]}</strong><small>{i === current ? "Current state" : i < current ? "Complete" : "Not reached"}</small></div></li>)}</ol></section>;
}
