import type { Proposal, Community } from "@/types/voxen";
import { sampleProposals, sampleSpaces } from "./sample-data";
export interface VoxenDataSource {
  listSpaces(): Promise<Community[]>;
  listProposals(): Promise<Proposal[]>;
  getSpace(id: string): Promise<Community | undefined>;
  getProposal(id: string): Promise<Proposal | undefined>;
}
export const demoDataSource: VoxenDataSource = {
  listSpaces: async () => sampleSpaces,
  listProposals: async () => sampleProposals,
  getSpace: async (id) => sampleSpaces.find((s) => s.id === id),
  getProposal: async (id) => sampleProposals.find((p) => p.id === id),
};
export const voxenData = demoDataSource;
// Live eligibility and voting use eligibility.ts / writes.ts. This source is sample-only.
export async function acceptSpaceOwnership(_spaceId: string): Promise<never> {
  throw new Error(
    "Owner acceptance requires a transaction from the intended wallet. Integration pending.",
  );
}
