"use client";

import { Check, CircleAlert, LoaderCircle, Send, ShieldCheck, Wallet } from "lucide-react";
type TraceState = { stage?: string; txId?: string; message?: string };
export function ConsensusTrace({ voting }: { voting?: TraceState }) {
  const stage = voting?.stage || "idle";
  const failed = stage === "failed";
  const finalized = stage === "finalized";
  const submitted = ["submitted", "accepted", "processing", "finalized"].includes(stage);
  const processing = ["accepted", "processing"].includes(stage);
  const steps = [
    [Wallet, "Wallet approval", "Approve the selected vote in your wallet.", ["preparing", "submitting"].includes(stage), submitted || finalized],
    [Send, "Transaction submitted", "The network has received the vote transaction.", stage === "submitted", submitted || finalized],
    [ShieldCheck, "Validator consensus", "Validators are processing the transaction.", processing, finalized],
    [Check, "Finalized", "The vote is recorded only after successful execution.", finalized, finalized],
  ] as const;
  if (stage === "idle") return null;
  return <section className={`consensus-trace${failed ? " is-error" : ""}`} aria-live="polite" aria-label="Vote transaction status">
    <h3>{failed ? "Vote needs attention" : finalized ? "Vote finalized" : "Vote in progress"}</h3>
    <ol>{steps.map(([Icon, label, explanation, active, complete]) => <li key={label} className={complete ? "is-complete" : active ? "is-active" : ""}>
      <span className="trace-icon">{active && !complete ? <LoaderCircle size={16} /> : failed && label === "Wallet approval" ? <CircleAlert size={16} /> : <Icon size={16} />}</span>
      <span><strong>{label}</strong><small>{explanation}</small></span>
    </li>)}</ol>
    {voting?.txId && <p className="trace-id">Transaction <code title={voting.txId}>{shortId(voting.txId)}</code></p>}
    {voting?.message && <p className="trace-message">{voting.message}</p>}
    {failed && <p className="trace-message">No vote was confirmed. Review the message above and try again when ready.</p>}
  </section>;
}

function shortId(value: string) { return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value; }
