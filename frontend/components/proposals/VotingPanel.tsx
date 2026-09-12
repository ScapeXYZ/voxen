"use client";
import { useState } from "react";
import type { Proposal } from "@/types/voxen";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { VoteController } from "@/hooks/useVoxenVote";
export function VotingPanel({ proposal: p, voting, eligibilityCheck }: { proposal: Proposal; voting?: VoteController; eligibilityCheck?: EligibilityCheck }) {
  const [selected, setSelected] = useState(""); const wallet = useWallet(); const now = Date.now();
  const active = p.status === "PUBLISHED" && now >= Date.parse(p.startsAt) && now < Date.parse(p.endsAt);
  const reason = !wallet.isConnected ? "Connect your wallet to vote." : !wallet.isOnCorrectNetwork ? "Switch to GenLayer Bradbury to vote." : !active ? "Voting is not active right now." : eligibilityCheck?.isFetching ? "Checking eligibility…" : !eligibilityCheck?.data?.eligible ? "Your wallet does not meet this proposal's requirement." : "";
  const visible = !p.talliesHidden;
  return <section className="panel voting-panel"><h3>Proposal options</h3><fieldset><legend className="sr-only">Choose a voting option</legend>{p.options.map((o) => <label className={`vote-option ${selected === o.id ? "chosen" : ""}`} key={o.id}><input type="radio" name="vote" value={o.id} checked={selected === o.id} disabled={!active || voting?.pending} onChange={() => setSelected(o.id)} /><span>{o.label}</span>{visible && <strong>{o.votes}</strong>}</label>)}</fieldset>{!visible && <p className="small muted">Results are hidden until voting closes.</p>}<button className="button primary full-width" disabled={!voting || !!reason || !selected} onClick={() => void voting?.cast(Number(selected))}>{reason || (p.voteChangePolicy === "CHANGE_UNTIL_CLOSE" ? "Cast or change vote" : "Cast vote")}</button><p className="small">{p.voteChangePolicy === "CHANGE_UNTIL_CLOSE" ? "Votes may be changed until close." : "Votes are final once cast."}</p>{p.result && <p>Final result: <strong>{p.result === "TIED" ? "TIED" : `WINNER — ${p.result}`}</strong>{p.result === "TIED" && " · No AI tie-breaking."}</p>}</section>;
}
