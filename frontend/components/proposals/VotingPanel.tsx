"use client";
import { useState } from "react";
import type { Proposal } from "@/types/voxen";
export function VotingPanel({ proposal: p }: { proposal: Proposal }) {
  const [selected, setSelected] = useState("");
  const visible =
    p.resultVisibility === "LIVE" || ["CLOSED", "FINALIZED"].includes(p.status);
  return (
    <section className="panel voting-panel">
      <div className="row">
        <h3>
          {p.status === "OPEN" ? "Your voice matters" : "Proposal options"}
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
              disabled={p.status !== "OPEN"}
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
      <button className="button primary full-width" disabled>
        {p.status === "FINALIZED"
          ? "This decision has been finalized."
          : p.status === "CLOSED"
            ? "Voting has ended."
            : p.status !== "OPEN"
              ? "This proposal is not currently open for voting."
              : "Voting unavailable · sample proposal"}
      </button>
      <p className="small muted">
        Sample proposal. Selections are previews; no vote or transaction is
        submitted.
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
          Final result: <strong>{p.result}</strong>
          {p.result === "TIED" && " · No AI tie-breaking."}
        </p>
      )}
    </section>
  );
}
