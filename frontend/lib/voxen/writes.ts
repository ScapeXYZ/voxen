"use client";

import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit";
import type { CalldataEncodable } from "genlayer-js/types";
import { createVoxenTransactionKit } from "@/lib/genlayer/kit";
import { getEthereumProvider } from "@/lib/genlayer/client";
import { createProposalArgs, type ProposalForm } from "./create-proposal";
import { voxenConfig } from "./config";
import { fetchEligibility } from "./eligibility-client";
import type { LiveProposal } from "./reads";
import type { VoteStage } from "./transaction-state";

type WriteUpdate = (state: { stage: VoteStage; evmHash?: string; txId?: string }) => void;
type VoxenMethod = "cast_vote" | "create_proposal" | "transition_proposal" | "request_governance_review";

async function assertActiveWallet(wallet: string) {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("Connect your wallet first");
  if (localStorage.getItem("wallet_disconnected") === "true")
    throw new Error("Connected wallet changed");
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  if (accounts[0]?.toLowerCase() !== wallet.toLowerCase())
    throw new Error("Connected wallet changed");
  const chain = await provider.request({ method: "eth_chainId" });
  if (Number(chain) !== voxenConfig.chainId) throw new Error("Unsupported network");
}

function trackedStage(status: TrackedStatus): VoteStage {
  if (status.phase === "submitted" || status.phase === "pending") return "submitted";
  if (status.phase === "processing") return "processing";
  if (status.phase === "decided") {
    // ACCEPTED is a consensus checkpoint, not proof that this write has
    // executed successfully. Keep waiting for FINALIZED.
    if (status.successful === true) return "processing";
    if (status.successful === false) return "failed";
    return "processing";
  }
  if (status.successful === true) return "finalized";
  if (status.successful === false) return "failed";
  return "processing";
}

async function submitContractWrite(
  wallet: string,
  method: VoxenMethod,
  args: CalldataEncodable[],
  update: WriteUpdate,
  beforeSign: () => void | Promise<void>,
) {
  await assertActiveWallet(wallet);
  await beforeSign();
  const kit = createVoxenTransactionKit(wallet);
  const tx: SubmitInput = {
    kind: "write",
    address: voxenConfig.contract as `0x${string}`,
    method,
    args,
  };
  const quote = await kit.estimate({ preset: "standard" }, tx);
  // Estimating may take time; verify the exact account and chain once more
  // before Transaction Kit opens the wallet confirmation request.
  await assertActiveWallet(wallet);
  await beforeSign();
  update({ stage: "submitting" });
  const submitted = await kit.submit(quote, tx);
  update({
    stage: "submitted",
    txId: submitted.genlayerTxId,
    evmHash: submitted.evmTxHash,
  });
  await kit.track(
    submitted.genlayerTxId,
    (status) => update({
      stage: trackedStage(status),
      txId: status.genlayerTxId,
      evmHash: status.evmTxHash ?? submitted.evmTxHash,
    }),
    { until: "finalized" },
  );
}

export async function submitVote(id: string, wallet: string, optionIndex: number, update: WriteUpdate) {
  const read = async <T>(suffix: string): Promise<T> => {
    const response = await fetch(
      `/api/voxen/proposals/${encodeURIComponent(id)}${suffix}`,
      { cache: "no-store", signal: AbortSignal.timeout(25_000) },
    );
    if (!response.ok) throw new Error("Could not refresh proposal before voting");
    return response.json();
  };
  const [live, eligibility] = await Promise.all([read<LiveProposal>(""), fetchEligibility(id, wallet)]);
  const proposal = live.proposal;
  const assertWindow = () => {
    const now = Date.now() / 1000;
    if (proposal.status !== "PUBLISHED" || now < Date.parse(proposal.startsAt) / 1000 || now >= Date.parse(proposal.endsAt) / 1000)
      throw new Error("Outside voting window");
  };
  assertWindow();
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= proposal.options.length)
    throw new Error("Invalid option index");
  if (!eligibility.eligible) throw new Error("Eligibility not verified");
  await submitContractWrite(wallet, "cast_vote", [id, optionIndex], update, assertWindow);
}

export async function createProposal(form: ProposalForm, options: string[], wallet: string, update: WriteUpdate) {
  const args = createProposalArgs(form, options);
  await submitContractWrite(wallet, "create_proposal", args, update, () => {
    createProposalArgs(form, options);
  });
}

export async function transitionProposal(id: string, status: "PUBLISHED" | "FINALIZED", wallet: string, update: WriteUpdate) {
  const assertTransition = async () => {
    const response = await fetch(`/api/voxen/proposals/${encodeURIComponent(id)}`, {
      cache: "no-store", signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error("Could not refresh proposal before changing its state");
    const { proposal, review } = await response.json() as {
      proposal: LiveProposal["proposal"];
      review: { classification: string } | null;
    };
    if (status === "PUBLISHED") {
      if (proposal.status !== "REVIEW") throw new Error("Proposal is not ready to publish");
      if (proposal.guardRequired && review?.classification !== "COMPLIANT")
        throw new Error("A compliant governance review is required before publication");
      return;
    }
    if (proposal.status !== "PUBLISHED" || Date.now() < Date.parse(proposal.endsAt))
      throw new Error("Proposal cannot be finalized before its voting window closes");
  };
  await assertTransition();
  await submitContractWrite(wallet, "transition_proposal", [id, status], update, assertTransition);
}

export async function requestGovernanceReview(id: string, wallet: string, update: WriteUpdate) {
  const assertReviewable = async () => {
    const response = await fetch(`/api/voxen/proposals/${encodeURIComponent(id)}`, {
      cache: "no-store", signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error("Could not refresh proposal before requesting review");
    const { proposal } = await response.json() as { proposal: LiveProposal["proposal"] };
    if (proposal.status !== "REVIEW" || !proposal.guardRequired)
      throw new Error("This proposal is not awaiting governance review");
  };
  await assertReviewable();
  await submitContractWrite(wallet, "request_governance_review", [id], update, assertReviewable);
}
