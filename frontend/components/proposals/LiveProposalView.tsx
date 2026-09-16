"use client";
import Link from "next/link";
import { useState } from "react";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";
import { useVoxenEligibility } from "@/hooks/useVoxenEligibility";
import { useVoxenVote } from "@/hooks/useVoxenVote";
import { LiveReadError, useVoxenProposal } from "@/hooks/useVoxenProposal";
import { voxenConfig } from "@/lib/voxen/config";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { requestGovernanceReview, transitionProposal } from "@/lib/voxen/writes";
import { StatusBadge } from "@/components/governance/Badges";
import { ProposalDetails } from "./ProposalDetails";
export function LiveProposalView({ id, compact = false }: { id: string; compact?: boolean }) {
  const now = useVotingClock(); const query = useVoxenProposal(id); const eligibility = useVoxenEligibility(id); const voting = useVoxenVote(id); const wallet = useWallet();
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const data = query.isSuccess ? query.data : undefined;
  // Reviews are read from the contract separately from proposal metadata.
  // Merge that live record for the shared, human-readable detail component.
  const p = data ? {
    ...data.proposal,
    guard: data.review ? {
      outcome: data.review.classification,
      risk: data.review.risk,
      confidence: data.review.confidence,
      evidenceConsistency: data.review.evidenceConsistent
        ? "Supporting evidence is consistent."
        : "Evidence consistency could not be confirmed.",
      reason: data.review.reason,
    } : undefined,
  } : undefined;
  const review = data?.review;
  const result = data?.result;
  const creator = !!p && wallet.address?.toLowerCase() === p.creator.toLowerCase();
  const submitLifecycle = async (write: () => Promise<void>) => {
    if (lifecyclePending || !wallet.address || !wallet.isOnCorrectNetwork) return;
    setLifecyclePending(true);
    try { await write(); await query.refetch(); } finally { setLifecyclePending(false); }
  };
  const status = <section className="panel" aria-busy={query.isFetching || lifecyclePending}><h2>Current contract state</h2><p className="small">{id} · {voxenConfig.networkName} · Live contract</p>{query.isFetching && <p>Loading live proposal from {voxenConfig.networkName}…</p>}{query.isError && <p role="alert">{query.error instanceof LiveReadError ? query.error.message : "Live proposal unavailable."}</p>}{p && <><p>Effective status: <strong>{votingState(p, now)}</strong>. {result === null && "No final result is recorded."}</p>{p.guardRequired && <p>Governance Review: {review ? `${review.classification} — ${review.reason}` : "Not requested"}</p>}{creator && p.status === "REVIEW" && <div className="row"><button className="button" disabled={lifecyclePending} onClick={() => void submitLifecycle(() => requestGovernanceReview(id, wallet.address!, () => undefined))}>Request Governance Review</button>{review?.classification === "COMPLIANT" && <button className="button primary" disabled={lifecyclePending} onClick={() => void submitLifecycle(() => transitionProposal(id, "PUBLISHED", wallet.address!, () => undefined))}>Publish</button>}</div>}{creator && p.status === "PUBLISHED" && now >= Date.parse(p.endsAt) && <button className="button primary" disabled={lifecyclePending} onClick={() => void submitLifecycle(() => transitionProposal(id, "FINALIZED", wallet.address!, () => undefined))}>Finalize</button>}{compact && <><h3><Link href={`/proposals/${id}`}>{p.title} ↗</Link></h3><StatusBadge status={votingState(p, now)} /><p>{p.talliesHidden ? "Results hidden until close." : `${p.participation} votes recorded.`}</p></>}</>}<button className="button" disabled={query.isFetching || lifecyclePending} onClick={() => void query.refetch()}>Refresh live state</button><details><summary>Read source</summary><p className="mono wrap">{voxenConfig.contract}</p></details></section>;
  if (compact) return status;
  return p ? <ProposalDetails p={p} liveState={status} eligibilityCheck={eligibility} voting={voting} /> : <main id="main" className="shell page"><h1>Proposal {id}</h1>{status}</main>;
}
