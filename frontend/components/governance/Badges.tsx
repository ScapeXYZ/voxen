import { Fingerprint, Shield, Coins } from "lucide-react";
import type { Eligibility, GovernanceGuardReview } from "@/types/voxen";
const labels: Record<string, string> = {
  UPCOMING: "Upcoming",
  LIVE: "Voting live",
  ENDED: "Voting ended",
  PUBLISHED: "Published",
  REVIEW: "Under review",
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
      {eligibility.mode === "GEN" ? (
        <Coins size={13} />
      ) : (
        <Fingerprint size={13} />
      )}{" "}
      {eligibility.mode === "PUBLIC"
        ? "Public voting"
        : eligibility.mode === "GEN"
        ? `${eligibility.minimum} GEN holding`
        : eligibility.mode === "POAP_EVENT"
          ? `POAP event ${eligibility.eventId}`
          : `${eligibility.standard} credential`}
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
