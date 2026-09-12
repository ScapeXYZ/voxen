import type { Proposal } from "@/types/voxen";
export function votingState(p: Proposal, now = Date.now()) {
  if (p.status === "FINALIZED") return "FINALIZED";
  if (p.status === "REVIEW") return p.status;
  if (now < Date.parse(p.startsAt)) return "UPCOMING";
  return now < Date.parse(p.endsAt) ? "LIVE" : "ENDED";
}
export function scheduleLabel(p: Proposal, now = Date.now()) {
  const date = (value: string) => new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const state = votingState(p, now);
  if (state === "FINALIZED") return "Final result";
  if (state === "UPCOMING") return `Voting starts ${date(p.startsAt)}`;
  if (state === "ENDED") return `Voting closed ${date(p.endsAt)}`;
  if (state === "LIVE") {
    const minutes = Math.ceil((Date.parse(p.endsAt) - now) / 60000);
    return `Ends in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return p.source === "live" && !p.guardRequired
    ? "Legacy deployment: scheduled voting is unavailable for this proposal."
    : "Awaiting publication and governance review";
}
