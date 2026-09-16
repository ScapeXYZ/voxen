import type { Proposal, Community } from "@/types/voxen";
import { StatusBadge } from "@/components/governance/Badges";

/** Render supplied review data only; live read adapters must never use sample reviews. */
export function GovernanceReview({ p, space }: { p: Proposal; space?: Community }) {
  if (!p.guard && !p.guardRequired) return null;
  return (
<section className="panel governance-review">
            <div className="panel-heading">
              <div><h2>Governance Review</h2><p>Validator review checks the proposal against Community rules and supplied evidence. It informs governance; it does not replace a vote or break ties.</p></div>
              {p.guard && <StatusBadge status={p.guard.outcome} />}
            </div>
            {p.guard && (
              <p>
                {p.guard.outcome === "COMPLIANT"
                  ? "Matches the Community’s governance rules."
                  : p.guard.outcome === "NEEDS_REVIEW"
                    ? "May need human review before proceeding."
                    : "Conflicts with one or more Community rules."}
              </p>
            )}
            {p.guard ? (
              <>
                <p>{p.guard.reason}</p>
                <div className="review-metrics">
                  <div>
                    <span>Risk</span>
                    <strong>{p.guard.risk}</strong>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <strong>{p.guard.confidence}%</strong>
                  </div>
                </div>
                <h4>Evidence consistency</h4>
                <p>{p.guard.evidenceConsistency}</p>
                <p className="small muted">This result is a review signal. Publication and finalization remain governed by the contract lifecycle.</p>
              </>
            ) : (
              <p className="muted">
                {p.guardRequired
                  ? "A governance review is required. Results are not available yet."
                  : "No governance review requested."}
              </p>
            )}
          </section>
  );
}
