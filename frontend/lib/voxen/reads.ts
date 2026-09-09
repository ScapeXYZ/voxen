import { formatUnits } from "viem";
import type { Eligibility, Proposal } from "@/types/voxen";
import { readVoxen } from "./client";

// Validate decoded SDK values before presenting them as contract state.
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid contract response");
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected contract text");
  return value;
}
function integer(value: unknown): number {
  const n =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)
    throw new Error("Invalid contract integer");
  return n;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid contract boolean");
  return value;
}
function enumeration<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (!values.includes(value as T))
    throw new Error("Unsupported contract value");
  return value as T;
}
function decimal(value: unknown): string {
  const s = str(value);
  if (!/^\d+$/.test(s)) throw new Error("Invalid contract decimal");
  return s;
}
export async function getProposalEligibility(id: string): Promise<Eligibility> {
  const e = record(await readVoxen("get_proposal_eligibility", [id]));
  if (e.mode === "GEN")
    return {
      mode: "GEN_HOLDING",
      minimum: formatUnits(BigInt(decimal(e.minimum_gen_balance)), 18),
      chainId: integer(e.configured_evm_chain_id),
    };
  enumeration(e.mode, ["POAP_NFT"]);
  return {
    mode: "POAP_NFT",
    chainId: integer(e.credential_chain_id),
    contract: str(e.credential_contract_address),
    label: str(e.credential_label),
    standard: enumeration(e.credential_type, ["ERC721", "ERC1155"]),
    tokenId:
      e.credential_token_id === null
        ? undefined
        : decimal(e.credential_token_id),
  };
}
export async function getProposal(id: string) {
  const p = record(await readVoxen("get_proposal", [id]));
  if (p.id !== id || !Array.isArray(p.options) || p.options.length < 2)
    throw new Error("Invalid proposal response");
  return {
    id: str(p.id),
    title: str(p.title),
    description: str(p.description),
    creator: str(p.creator),
    communityId: p.space_id === null ? null : str(p.space_id),
    representedEntity: null,
    spaceId: p.space_id === null ? undefined : str(p.space_id),
    status: enumeration(p.status, [
      "PUBLISHED",
      "DRAFT",
      "REVIEW",
      "OPEN",
      "CLOSED",
      "FINALIZED",
    ]),
    startsAt: new Date(integer(p.start_time) * 1000).toISOString(),
    endsAt: new Date(integer(p.end_time) * 1000).toISOString(),
    guardRequired: bool(p.governance_guard_required),
    evidenceUrl:
      typeof p.evidence_url === "string" && /^https?:\/\//i.test(p.evidence_url)
        ? p.evidence_url
        : undefined,
    voteChangePolicy: enumeration(p.vote_change_policy, [
      "FINAL_ON_CAST",
      "CHANGE_UNTIL_CLOSE",
    ]),
    resultVisibility: enumeration(p.result_visibility, [
      "LIVE",
      "HIDDEN_UNTIL_CLOSE",
    ]),
    options: p.options.map((label, i) => ({
      id: String(i),
      label: str(label),
      votes: 0,
    })),
    source: "live" as const,
  };
}
export async function getProposalTimeWindow(id: string) {
  const w = record(await readVoxen("get_proposal_time_window", [id]));
  return {
    start: integer(w.start_time),
    end: integer(w.end_time),
    observedTime: integer(w.transaction_time),
    window: enumeration(w.window, ["BEFORE", "WITHIN", "ENDED"]),
  };
}
export async function getProposalTallies(id: string) {
  const t = record(await readVoxen("get_proposal_tallies", [id]));
  const hidden = bool(t.hidden);
  if (hidden ? t.counts !== null : !Array.isArray(t.counts))
    throw new Error("Invalid tally visibility");
  return {
    hidden,
    counts: hidden ? null : (t.counts as unknown[]).map(integer),
    total: integer(t.total_votes),
  };
}
export async function getProposalResult(id: string) {
  const raw = await readVoxen("get_proposal_result", [id]);
  if (raw === null) return null;
  const r = record(raw);
  return {
    status: enumeration(r.status, ["WINNER", "TIED"]),
    winningOption: r.winning_option === null ? null : str(r.winning_option),
    winningIndex:
      r.winning_option_index === null ? null : integer(r.winning_option_index),
    total: integer(r.total_votes),
  };
}
export async function getVote(id: string, wallet: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || /^0x0{40}$/i.test(wallet))
    throw new Error("Invalid wallet address");
  const raw = await readVoxen("get_vote", [id, wallet]);
  if (raw === null) return null;
  const v = record(raw);
  return {
    proposalId: str(v.proposal_id),
    voter: str(v.voter),
    optionIndex: v.option_index === null ? null : integer(v.option_index),
    castAt: integer(v.cast_at),
    updatedAt: integer(v.updated_at),
    changed: bool(v.changed),
  };
}
export async function loadVoxenProposal(id: string) {
  const base = await getProposal(id);
  const [eligibility, timeWindow, tallies, result] = await Promise.all([
    getProposalEligibility(id),
    getProposalTimeWindow(id),
    getProposalTallies(id),
    getProposalResult(id),
  ]);
  if (
    tallies.counts &&
    (tallies.counts.length !== base.options.length ||
      tallies.counts.reduce((a, b) => a + b, 0) !== tallies.total)
  )
    throw new Error("Inconsistent contract tallies; refresh to retry");
  const proposal: Proposal = {
    ...base,
    eligibility,
    participation: tallies.total,
    talliesHidden: tallies.hidden,
    options: base.options.map((o, i) => ({
      ...o,
      votes: tallies.counts?.[i] ?? 0,
    })),
    result:
      result?.status === "TIED" ? "TIED" : (result?.winningOption ?? undefined),
  };
  return { proposal, timeWindow, result, fetchedAt: new Date().toISOString() };
}
export type LiveProposal = Awaited<ReturnType<typeof loadVoxenProposal>>;

export async function discoverProposals(offset = 0) {
  const page = record(await readVoxen("get_proposal_ids", [offset, 20]));
  if (!Array.isArray(page.ids) || page.ids.length > 20) throw new Error("Invalid discovery page");
  const ids = page.ids.map(str);
  if (ids.some((id) => !/^proposal-[1-9]\d*$/.test(id))) throw new Error("Invalid proposal ID");
  const nextOffset = page.next_offset === null ? null : integer(page.next_offset);
  if (nextOffset !== null && nextOffset <= offset) throw new Error("Invalid discovery cursor");
  const proposals = await Promise.all(ids.map(async (id) => (await loadVoxenProposal(id)).proposal));
  return { proposals, total: integer(page.total), nextOffset };
}
