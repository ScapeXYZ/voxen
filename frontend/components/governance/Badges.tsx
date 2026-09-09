import { Fingerprint, Shield, Coins } from "lucide-react";
import type { Eligibility, GovernanceGuardReview } from "@/types/voxen";
const labels: Record<string, string> = {
  DRAFT: "Draft",
  REVIEW: "Under review",
  OPEN: "Voting open",
  CLOSED: "Voting closed",
  FINALIZED: "Finalized",
  TIED: "Tied",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  COMPLIANT: "Compliant",
  NEEDS_REVIEW: "Needs review",
  NON_COMPLIANT: "Non-compliant",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}
export function EligibilityBadge({
  eligibility,
}: {
  eligibility: Eligibility;
}) {
  return (
    <span className="meta-tag">
      {eligibility.mode === "GEN_HOLDING" ? (
        <Coins size={13} />
      ) : (
        <Fingerprint size={13} />
      )}{" "}
      {eligibility.mode === "GEN_HOLDING"
        ? `${eligibility.minimum} GEN holding`
        : `${eligibility.label} credential`}
    </span>
  );
}
export function GovernanceGuardBadge({
  review,
}: {
  review?: GovernanceGuardReview;
}) {
  return (
    <span className="meta-tag">
      <Shield size={13} />
      {review ? review.outcome.replaceAll("_", " ").toLowerCase() : "Guard off"}
    </span>
  );
}
