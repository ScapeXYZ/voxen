"use client";
import { votingState } from "@/lib/voxen/lifecycle";
import { useState, useEffect } from "react";
import type { Proposal } from "@/types/voxen";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { VoteController } from "@/hooks/useVoxenVote";
import type { useVoxenRecordedVote } from "@/hooks/useVoxenProposal";
import type { LiveProposal } from "@/lib/voxen/reads";
import { voteStageLabels } from "@/lib/voxen/transaction-state";
export function VotingPanel({
  proposal: p,
  voting,
  eligibilityCheck,
  recordedVote,
  timeWindow,
}: {
  proposal: Proposal;
  voting?: VoteController;
  eligibilityCheck?: EligibilityCheck;
  recordedVote?: ReturnType<typeof useVoxenRecordedVote>;
  timeWindow?: LiveProposal["timeWindow"];
}) {
  const [selected, setSelected] = useState("");
  const wallet = useWallet();
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setSelected(""), [wallet.address, p.id]);
  const state = votingState(p, now * 1000);
  const published = p.status === "PUBLISHED" || p.status === "OPEN";
  const live = p.source === "live";
  const ballot = recordedVote?.data?.vote;
  const locked = !!ballot && p.voteChangePolicy === "FINAL_ON_CAST";
  const active =
    !!timeWindow &&
    published &&
    now >= timeWindow.start &&
    now < timeWindow.end;
  const reason = !live
    ? p.status === "FINALIZED"
      ? "This decision has been finalized."
      : p.status === "CLOSED"
        ? "Voting has ended."
        : !published
          ? "This proposal is not currently open for voting."
          : "Voting unavailable · sample proposal"
    : !wallet.isConnected
      ? "Connect your wallet to vote."
      : !wallet.isOnCorrectNetwork
        ? "Switch to GenLayer Bradbury to vote."
        : !published
          ? "This proposal is not currently open for voting."
          : !active
            ? "Voting is not active right now."
            : voting?.pending
              ? "Your vote is being processed."
              : recordedVote?.isFetching
                ? "Checking your recorded vote..."
                : !recordedVote?.isSuccess
                  ? "Your recorded vote is unavailable. Refresh to try again."
                  : locked
                    ? "Your vote has already been recorded and cannot be changed."
                    : eligibilityCheck?.isFetching
                      ? "Checking your voting eligibility..."
                      : eligibilityCheck?.isError
                        ? "We couldn't verify your voting eligibility. Try again."
                        : !eligibilityCheck?.data?.eligible
                          ? "Your wallet does not meet this proposal's voting requirement."
                          : "";
  const sameChoice =
    selected !== "" && ballot?.optionIndex === Number(selected);
  const canSubmit = !!voting && !reason && selected !== "" && !sameChoice;

  const visible =
    p.talliesHidden !== undefined
      ? !p.talliesHidden
      : p.resultVisibility === "LIVE" ||
        ["CLOSED", "FINALIZED"].includes(p.status);
  return (
    <section className="panel voting-panel">
      <div className="row">
        <h3>
          {state === "LIVE" ? "Your voice matters" : "Proposal options"}
        </h3>
        <span className="mono">1 WALLET = 1 VOTE</span>
      </div>
      <fieldset>
        <legend className="sr-only">Choose a voting option</legend>
        {p.options.map((o) => (
          <label
            className={`vote-option ${selected === o.id ? "chosen" : ""}`}
            key={o.id}
          >
            <input
              type="radio"
              name="vote"
              value={o.id}
              checked={selected === o.id}
              disabled={
                !published ||
                (live && (!active || locked || voting?.pending))
              }
              onChange={() => setSelected(o.id)}
            />
            <span>{o.label}</span>
            {visible && <strong>{o.votes}</strong>}
            {visible && (
              <span
                className="tally-bar"
                style={{
                  width: `${p.participation ? (o.votes / p.participation) * 100 : 0}%`,
                }}
              />
            )}
          </label>
        ))}
      </fieldset>
      {!visible && (
        <p className="small muted">Results are hidden until voting closes.</p>
      )}
      {selected && (
        <p role="status">
          Selected choice:{" "}
          <strong>{p.options.find((o) => o.id === selected)?.label}</strong>
        </p>
      )}
      <button
        className="button primary full-width"
        disabled={!canSubmit}
        onClick={() => void voting?.cast(Number(selected))}
      >
        {reason ||
          (sameChoice
            ? "Choose a different option"
            : selected === ""
              ? "Choose an option"
              : ballot
                ? "Change vote"
                : "Cast vote")}
      </button>
      {live && !active && (
        <p className="small">
          {state === "UPCOMING" ? "Voting has not started." : state === "ENDED" || state === "FINALIZED" ? "Voting has ended." : "This deployment has not published the proposal for scheduled voting."}
        </p>
      )}
      {live && locked && (
        <p className="small">
          Your vote has already been recorded and cannot be changed.
        </p>
      )}
      {live && ballot && (
        <p>
          Your recorded choice:{" "}
          <strong>
            {ballot.optionIndex === null
              ? "Hidden until voting closes"
              : p.options[ballot.optionIndex]?.label || "Unavailable"}
          </strong>
        </p>
      )}
      {voting && voting.stage !== "idle" && (
        <div aria-live="polite">
          <p role="status">{voteStageLabels[voting.stage]}</p>
          {voting.message && <p role="alert">{voting.message}</p>}
          {voting.monitoringError && (
            <p role="alert">
              Transaction status is temporarily unavailable. Your vote may still
              be processing; do not resubmit.
            </p>
          )}
          {(voting.evmHash ||
            voting.txId ||
            voting.technical ||
            voting.monitoringError) && (
            <details>
              <summary>Transaction details</summary>
              {voting.evmHash && (
                <p className="mono wrap">
                  Wallet transaction: {voting.evmHash}
                </p>
              )}
              {voting.txId && (
                <p className="mono wrap">GenLayer transaction: {voting.txId}</p>
              )}
              <p className="small wrap">
                {voting.monitoringError || voting.technical}
              </p>
            </details>
          )}
          {voting.monitoringError && (
            <button
              className="button"
              onClick={() => void voting.retryStatus()}
            >
              Retry transaction status
            </button>
          )}
        </div>
      )}
      <p className="small muted">
        {live
          ? "Your wallet confirms the transaction and network fee. The contract verifies eligibility when the vote executes."
          : "Sample proposal. Selections are previews; no vote or transaction is submitted."}
      </p>
      <div className="card-foot">
        <span>{p.participation} participants</span>
        <span>
          {p.voteChangePolicy === "FINAL_ON_CAST"
            ? "Votes cannot be changed"
            : "Votes can change until close"}
        </span>
      </div>
      <p className="small">
        {p.voteChangePolicy === "FINAL_ON_CAST"
          ? "This proposal does not allow changing your vote after submission."
          : "You can change your vote until voting closes."}
      </p>
      <p className="small muted">
        After voting closes, the tally determines the recorded outcome when the
        proposal is finalized. A tie remains tied.
      </p>
      {p.result && (
        <p>
          Final result:{" "}
          <strong>{p.result === "TIED" ? "Tied" : p.result}</strong>
          {p.result === "TIED" && " · No AI tie-breaking."}
        </p>
      )}
    </section>
  );
}
