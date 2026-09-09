import type { Proposal, Space, Eligibility } from "@/types/voxen";
import { sampleProposals, sampleSpaces } from "./sample-data";
import { voxenConfig } from "./config";
export interface VoxenDataSource {
  listSpaces(): Promise<Space[]>;
  listProposals(): Promise<Proposal[]>;
  getSpace(id: string): Promise<Space | undefined>;
  getProposal(id: string): Promise<Proposal | undefined>;
}
export const demoDataSource: VoxenDataSource = {
  listSpaces: async () => sampleSpaces,
  listProposals: async () => sampleProposals,
  getSpace: async (id) => sampleSpaces.find((s) => s.id === id),
  getProposal: async (id) => sampleProposals.find((p) => p.id === id),
};
export const voxenData = demoDataSource;
export type EligibilityResult = {
  status: "unknown" | "eligible" | "ineligible";
  reason: string;
};
/** Replace with verified contract reads using the pinned application config. Never infer eligibility from connection. */
export async function checkEligibility(
  _wallet: string,
  _requirement: Eligibility,
): Promise<EligibilityResult> {
  return {
    status: "unknown",
    reason: "Live eligibility checks are not connected yet.",
  };
}
/** Integration boundary: implement the deployed ABI before enabling writes. */
export const liveConnection = { config: voxenConfig, ready: false as const };
export async function submitProposal(_proposal: unknown): Promise<never> {
  throw new Error(
    "Contract submission is not connected. Save a local draft instead.",
  );
}
export async function castVote(
  _proposalId: string,
  _optionId: string,
): Promise<never> {
  throw new Error("Live voting is not connected. No transaction was sent.");
}
export async function acceptSpaceOwnership(_spaceId: string): Promise<never> {
  throw new Error(
    "Owner acceptance requires a transaction from the intended wallet. Integration pending.",
  );
}
