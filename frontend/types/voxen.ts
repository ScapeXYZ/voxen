export type ProposalStatus =
  "PUBLISHED" | "REVIEW" | "FINALIZED";
export type EligibilityMode = "PUBLIC" | "GEN" | "POAP_NFT" | "POAP_EVENT";
export type VoteChangePolicy = "FINAL_ON_CAST" | "CHANGE_UNTIL_CLOSE";
export type ResultVisibility = "LIVE" | "HIDDEN_UNTIL_CLOSE";
export type Eligibility =
  | { mode: "PUBLIC" }
  | { mode: "GEN"; minimum: string; chainId?: number }
  | {
      mode: "POAP_NFT";
      contract: string;
      chainId?: number;
      label?: string;
      standard: "ERC721" | "ERC1155";
      tokenId?: string;
    }
  | { mode: "POAP_EVENT"; eventId: string };
export interface GovernanceGuardReview {
  outcome: "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT";
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  evidenceConsistency: string;
  reason: string;
}
export interface Community {
  id: string;
  name: string;
  description: string;
  owner: string;
  guardEnabled: boolean;
  nonCompliantPolicy: "BLOCK_NON_COMPLIANT";
  active: boolean;
}
export interface Proposal {
  id: string;
  title: string;
  description: string;
  communityId?: string | null;
  creator: string;
  status: ProposalStatus;
  startsAt: string;
  endsAt: string;
  eligibility: Eligibility;
  guard?: GovernanceGuardReview;
  evidenceUrl?: string;
  voteChangePolicy: VoteChangePolicy;
  resultVisibility: ResultVisibility;
  options: { id: string; label: string; votes: number }[];
  participation: number;
  result?: "TIED" | string;
  source: "live";
  talliesHidden?: boolean;
  guardRequired?: boolean;
}

// Future Community context only; public create_proposal still accepts one evidence_url.
export type SupportingSourceType =
  | "GOVERNANCE_DISCUSSION" | "DOCUMENTATION" | "ANNOUNCEMENT"
  | "RESEARCH" | "BUDGET" | "GITHUB" | "OTHER";
export interface SupportingSource {
  id: string;
  title?: string;
  url: string;
  domain?: string;
  sourceType?: SupportingSourceType;
}
/** Exact review record fields from contracts/voxen.py; no unsupported result lists. */
export interface GovernanceReviewRecord {
  id: string;
  proposal_id: string;
  proposal_revision: number;
  rules_revision: number;
  created_at: number;
  classification: GovernanceGuardReview["outcome"];
  risk: GovernanceGuardReview["risk"];
  confidence: number;
  evidence_consistent: boolean;
  reason: string;
  input_snapshot: { constitution: string; proposal: Record<string, unknown> };
}
export interface CommunityProposalRevisionContext {
  revision: number;
  /** Future persistence, not submitted by the current adapter. */
  supportingSources?: SupportingSource[];
}
