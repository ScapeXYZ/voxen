"use client";
import type { Proposal } from "@/types/voxen";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";
export function LifecycleTimeline({ proposal }: { proposal: Proposal }) {
  const state = votingState(proposal, useVotingClock());
  const stages = proposal.guardRequired
    ? ["REVIEW", "UPCOMING", "LIVE", "ENDED", "FINALIZED"]
    : ["UPCOMING", "LIVE", "ENDED", "FINALIZED"];
  const labels = proposal.guardRequired
    ? ["Governance review", "Upcoming", "Voting live", "Ended", "Finalized"]
    : ["Upcoming", "Voting live", "Ended", "Finalized"];
  return <ol className="lifecycle">{stages.map((s, i) => <li key={s}
    className={i <= stages.indexOf(state) ? "reached" : ""}
    aria-current={s === state ? "step" : undefined}><span />{labels[i]}</li>)}</ol>;
}
