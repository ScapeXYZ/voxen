import type { Proposal } from "@/types/voxen";
export function LifecycleTimeline({ proposal: p }: { proposal: Proposal }) {
  const stages = p.guard
    ? ["DRAFT", "REVIEW", "OPEN", "CLOSED", "FINALIZED"]
    : ["DRAFT", "OPEN", "CLOSED", "FINALIZED"];
  return (
    <ol className="lifecycle">
      {stages.map((s, i) => (
        <li
          key={s}
          className={i <= stages.indexOf(p.status) ? "reached" : ""}
          aria-current={s === p.status ? "step" : undefined}
        >
          <span />
          {
            {
              DRAFT: "Draft",
              REVIEW: "Under review",
              OPEN: "Voting open",
              CLOSED: "Voting closed",
              FINALIZED: "Finalized",
            }[s]
          }
        </li>
      ))}
    </ol>
  );
}
