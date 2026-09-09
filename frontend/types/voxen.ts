export type ProposalStatus =
  "DRAFT" | "REVIEW" | "OPEN" | "CLOSED" | "FINALIZED";
export type EligibilityMode = "GEN_HOLDING" | "POAP_NFT";
export type VoteChangePolicy = "FINAL_ON_CAST" | "CHANGE_UNTIL_CLOSE";
export type ResultVisibility = "LIVE" | "HIDDEN_UNTIL_CLOSE";
export type Eligibility =
  | { mode: "GEN_HOLDING"; minimum: string }
  | {
      mode: "POAP_NFT";
      chainId: number;
      contract: string;
      label: string;
      standard: "ERC721" | "ERC1155";
      tokenId?: string;
    };
export interface GovernanceGuardReview {
  outcome: "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT";
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  evidenceConsistency: string;
  reason: string;
}
export interface Space {
  id: string;
  name: string;
  description: string;
  owner: string;
  admins: string[];
  constitution: string;
  permission: "OWNER_ADMINS" | "OPEN";
  guardEnabled: boolean;
  nonCompliantPolicy: "BLOCK" | "WARN";
  active: boolean;
  pendingOwner?: string;
  symbol: string;
  category: string;
}
export interface Proposal {
  id: string;
  title: string;
  description: string;
  spaceId?: string;
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
  source: "demo";
}
