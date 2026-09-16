import { formatUnits } from "viem";
import type { Eligibility, Proposal } from "@/types/voxen";
import { readVoxen } from "./client";
import { createDiscoveryService } from "./discovery";

function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid contract response"); return value as Record<string, unknown>; }
function str(value: unknown): string { if (typeof value !== "string") throw new Error("Expected contract text"); return value; }
function integer(value: unknown): number { const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value; if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) throw new Error("Invalid contract integer"); return n; }
function bool(value: unknown): boolean { if (typeof value !== "boolean") throw new Error("Invalid contract boolean"); return value; }
function enumeration<T extends string>(value: unknown, values: readonly T[]): T { if (!values.includes(value as T)) throw new Error(`Unsupported contract value: ${String(value)}`); return value as T; }
function decimal(value: unknown): string { const s = str(value); if (!/^\d+$/.test(s)) throw new Error("Invalid decimal"); return s; }

export async function getProposalEligibility(id: string): Promise<Eligibility> {
  const e = record(await readVoxen("get_proposal_eligibility", [id]));
  if (e.mode === "PUBLIC") return { mode: "PUBLIC" };
  if (e.mode === "GEN") return { mode: "GEN", minimum: formatUnits(BigInt(decimal(e.minimum_gen_balance)), 18) };
  if (e.mode === "POAP_EVENT") return { mode: "POAP_EVENT", eventId: decimal(e.poap_event_id) };
  return { mode: enumeration(e.mode, ["POAP_NFT"]), contract: str(e.credential_contract_address), standard: enumeration(e.credential_type, ["ERC721", "ERC1155"]), tokenId: e.credential_token_id === null ? undefined : decimal(e.credential_token_id) };
}
export async function getSpace(id: string) {
  const s = record(await readVoxen("get_space", [id]));
  return {
    id: str(s.id), name: str(s.name), description: str(s.description),
    owner: str(s.owner), governanceRules: str(s.governance_rules),
    guardEnabled: bool(s.governance_guard_enabled), active: bool(s.active),
  };
}
export async function getSpaceIds(offset = 0, limit = 20) {
  const page = record(await readVoxen("get_space_ids", [offset, limit]));
  return {
    ids: (page.ids as unknown[]).map(str),
    total: integer(page.total),
    nextOffset: page.next_offset === null ? null : integer(page.next_offset),
  };
}
export async function getProposal(id: string): Promise<Proposal> {
  const p = record(await readVoxen("get_proposal", [id]));
  if (p.id !== id || !Array.isArray(p.options) || p.options.length < 2) throw new Error("Invalid proposal response");
  const eligibility = await getProposalEligibility(id);
  return { id: str(p.id), title: str(p.title), description: str(p.description), creator: str(p.creator), communityId: p.space_id === null ? null : str(p.space_id), status: enumeration(p.status, ["PUBLISHED", "REVIEW", "FINALIZED"]), startsAt: new Date(integer(p.start_time) * 1000).toISOString(), endsAt: new Date(integer(p.end_time) * 1000).toISOString(), guardRequired: bool(p.governance_guard_required), evidenceUrl: typeof p.evidence_url === "string" ? p.evidence_url : undefined, voteChangePolicy: enumeration(p.vote_change_policy, ["FINAL_ON_CAST", "CHANGE_UNTIL_CLOSE"]), resultVisibility: enumeration(p.result_visibility, ["LIVE", "HIDDEN_UNTIL_CLOSE"]), eligibility, options: p.options.map((label, i) => ({ id: String(i), label: str(label), votes: 0 })), participation: 0, source: "live" };
}
export async function getProposalTallies(id: string) { const t = record(await readVoxen("get_proposal_tallies", [id])); const hidden = bool(t.hidden); return { hidden, counts: hidden ? null : (t.counts as unknown[]).map(integer), total: integer(t.total_votes) }; }
export async function getProposalResult(id: string) { const raw = await readVoxen("get_proposal_result", [id]); if (raw === null) return null; const r = record(raw); return { status: enumeration(r.status, ["WINNER", "TIED"]), winningOption: r.winning_option === null ? null : str(r.winning_option), total: integer(r.total_votes) }; }
export async function getLatestGovernanceReview(id: string) { const raw = await readVoxen("get_latest_governance_review", [id]); if (raw === null) return null; const r = record(raw); return { id: str(r.id), classification: enumeration(r.classification, ["COMPLIANT", "NEEDS_REVIEW", "NON_COMPLIANT"]), risk: enumeration(r.risk, ["LOW", "MEDIUM", "HIGH", "CRITICAL"]), confidence: integer(r.confidence), evidenceConsistent: bool(r.evidence_consistent), reason: str(r.reason), createdAt: integer(r.created_at) }; }
export async function checkEligibility(id: string, wallet: string) { return record(await readVoxen("check_eligibility", [id, wallet])); }
export async function loadVoxenProposal(id: string) { const [base, tallies, result, review] = await Promise.all([getProposal(id), getProposalTallies(id), getProposalResult(id), getLatestGovernanceReview(id)]); const proposal = { ...base, participation: tallies.total, talliesHidden: tallies.hidden, options: base.options.map((o, i) => ({ ...o, votes: tallies.counts?.[i] ?? 0 })), result: result?.status === "TIED" ? "TIED" : result?.winningOption ?? undefined }; return { proposal, result, review, fetchedAt: new Date().toISOString() }; }
export type LiveProposal = Awaited<ReturnType<typeof loadVoxenProposal>>;
async function readProposalDiscovery(offset: number, limit: number) { const page = record(await readVoxen("get_proposal_ids", [offset, limit])); const ids = (page.ids as unknown[]).map(str); const proposals = await Promise.all(ids.map((id) => loadVoxenProposal(id).then((item) => item.proposal))); return { proposals, total: integer(page.total), nextOffset: page.next_offset === null ? null : integer(page.next_offset) }; }
const discover = createDiscoveryService(readProposalDiscovery);
export async function discoverProposals(offset = 0, limit = 20) { return discover(offset, limit); }
