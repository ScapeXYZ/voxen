"use client";
import Link from "next/link";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";
import { useVoxenEligibility } from "@/hooks/useVoxenEligibility";
import { useVoxenVote } from "@/hooks/useVoxenVote";
import {
  LiveReadError,
  useVoxenProposal,
  useVoxenRecordedVote,
} from "@/hooks/useVoxenProposal";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { voxenConfig } from "@/lib/voxen/config";
import { StatusBadge } from "@/components/governance/Badges";
import { ProposalDetails } from "./ProposalDetails";

export function LiveProposalView({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const now = useVotingClock();
  const query = useVoxenProposal(id);
  const wallet = useWallet();
  const vote = useVoxenRecordedVote(id, wallet.address);
  const eligibility = useVoxenEligibility(id);
  const voting = useVoxenVote(id);
  const state = query.isFetching
    ? "Loading"
    : query.isError
      ? query.error instanceof LiveReadError &&
        query.error.state === "unavailable"
        ? "Unavailable"
        : "Error"
      : query.data
        ? "Live"
        : "Unavailable";
  // Never retain stale successful data under a failed or pending refresh.
  const data = state === "Live" ? query.data : undefined;
  const p = data?.proposal;
  const status = (
    <section className="panel" aria-busy={state === "Loading"}>
      <div className="row">
        <h2>Current contract state</h2>
        <span className="badge" role="status">
          {state}
        </span>
      </div>
      <p className="small">{id} · Bradbury · Live contract</p>
      {state === "Loading" && <p>Loading live proposal from Bradbury…</p>}
      {(state === "Error" || state === "Unavailable") && (
        <p role="alert">
          {query.error?.message || "Proposal unavailable."} No sample data is
          shown.
        </p>
      )}
      {data && p && (
        <>
          <p>
            Voting window:{" "}
            <strong>
              {
                {
                  BEFORE: "Not started",
                  WITHIN: "Within scheduled window",
                  ENDED: "Ended",
                }[data.timeWindow.window]
              }
            </strong>
            . {data.result === null && "No final result is recorded."}
          </p>
          <p className="small muted">
            Read at {data.fetchedAt}. Latest non-final state; independent reads
            may span state updates. The voting window is the contract’s
            execution-time preview.
          </p>
          {compact && (
            <>
              <h3>
                <Link href={`/proposals/${id}`}>{p.title} ↗</Link>
              </h3>
              <StatusBadge status={votingState(p, now)} />
              <div className="proof-tally">
                {p.options.map((o) => (
                  <div key={o.id}>
                    <strong>{p.talliesHidden ? "Hidden" : o.votes}</strong>
                    <span>{o.label}</span>
                  </div>
                ))}
                <div>
                  <strong>{p.participation}</strong>
                  <span>Total votes</span>
                </div>
              </div>
              <p>
                {p.talliesHidden
                  ? "Results hidden until close."
                  : "Results visible."}
              </p>
            </>
          )}
          <p role="status">
            {!wallet.address
              ? "Connect a wallet to read its recorded vote."
              : vote.isFetching
                ? "Loading wallet vote…"
                : vote.isError
                  ? "Error: wallet vote could not be read."
                  : vote.data?.vote === null
                    ? "Live: this wallet has no recorded vote."
                    : vote.data?.vote
                      ? vote.data.vote.optionIndex === null
                        ? "Live: vote recorded; choice is hidden."
                        : `Live: recorded vote — ${p.options[vote.data.vote.optionIndex]?.label ?? "Unavailable option"}.`
                      : "Wallet vote unavailable."}
          </p>
          {vote.isError && (
            <button className="button" onClick={() => void vote.refetch()}>
              Retry wallet vote
            </button>
          )}
        </>
      )}
      <button
        className="button"
        disabled={query.isFetching}
        onClick={() => {
          void query.refetch();
          if (wallet.address) void vote.refetch();
        }}
      >
        Refresh live state
      </button>
      <details>
        <summary>Read source</summary>
        <p className="mono wrap">{voxenConfig.contract}</p>
        <p className="mono wrap">{voxenConfig.rpc}</p>
        <p>External EVM chain: {voxenConfig.chainId}</p>
        <p className="mono wrap">{voxenConfig.evmRpc}</p>
      </details>
    </section>
  );
  if (compact) return status;
  if (p)
    return (
      <ProposalDetails
        p={p}
        liveState={status}
        eligibilityCheck={eligibility}
        voting={voting}
        recordedVote={vote}
        timeWindow={data!.timeWindow}
      />
    );
  return (
    <main id="main" className="shell page">
      <h1>Proposal {id}</h1>
      {status}
    </main>
  );
}
