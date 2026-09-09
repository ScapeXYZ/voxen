"use client";
import { createClient } from "genlayer-js";
import type { CalldataEncodable } from "genlayer-js/types";
import { createProposalArgs, type ProposalForm } from "./create-proposal";
import { testnetBradbury } from "genlayer-js/chains";
import { getEthereumProvider } from "@/lib/genlayer/client";
import { voxenConfig } from "./config";
import type { LiveProposal, getVote } from "./reads";
import type { VoteStage } from "./transaction-state";
import { fetchEligibility } from "./eligibility-client";

export async function submitVote(
  id: string,
  wallet: string,
  optionIndex: number,
  update: (state: {
    stage: VoteStage;
    evmHash?: string;
    txId?: string;
  }) => void,
) {
  const read = async <T>(suffix: string): Promise<T> => {
    const response = await fetch(
      `/api/voxen/proposals/${encodeURIComponent(id)}${suffix}`,
      { cache: "no-store", signal: AbortSignal.timeout(25_000) },
    );
    if (!response.ok)
      throw new Error("Could not refresh proposal before voting");
    return response.json();
  };
  const [live, recorded, eligibility] = await Promise.all([
    read<LiveProposal>(""),
    read<{ vote: Awaited<ReturnType<typeof getVote>> }>(
      `?wallet=${encodeURIComponent(wallet)}`,
    ),
    fetchEligibility(id, wallet),
  ]);
  const p = live.proposal;
  const assertWindow = () => {
    const now = Date.now() / 1000;
    if (p.status !== "PUBLISHED" && p.status !== "OPEN") throw new Error("Proposal is not published");
    if (
      live.timeWindow.window !== "WITHIN" ||
      now < live.timeWindow.start ||
      now >= live.timeWindow.end
    )
      throw new Error("Outside voting window");
  };
  assertWindow();
  if (
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= p.options.length
  )
    throw new Error("Invalid option index");
  if (recorded.vote && p.voteChangePolicy === "FINAL_ON_CAST")
    throw new Error("Vote is final");
  if (recorded.vote?.optionIndex === optionIndex)
    throw new Error("Same option is a no-op");
  if (!eligibility.eligible) throw new Error("Eligibility not verified");
  await submitContractWrite(
    wallet,
    "cast_vote",
    [id, optionIndex],
    update,
    assertWindow,
  );
}

type WriteUpdate = (state: {
  stage: VoteStage;
  evmHash?: string;
  txId?: string;
}) => void;
async function submitContractWrite(
  wallet: string,
  functionName: "cast_vote" | "create_proposal",
  args: CalldataEncodable[],
  update: WriteUpdate,
  beforeSend: () => void,
) {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("Connect your wallet first");
  const assertWallet = async () => {
    if (localStorage.getItem("wallet_disconnected") === "true")
      throw new Error("Connected wallet changed");
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    if (accounts[0]?.toLowerCase() !== wallet.toLowerCase())
      throw new Error("Connected wallet changed");
    const chain = await provider.request({ method: "eth_chainId" });
    if (Number(chain) !== voxenConfig.chainId || voxenConfig.chainId !== 4221)
      throw new Error("Unsupported network");
  };
  await assertWallet();
  let sent = false;
  const client = createClient({
    account: wallet as `0x${string}`,
    chain: {
      ...testnetBradbury,
      rpcUrls: { default: { http: [voxenConfig.rpc] } },
    },
    provider: {
      request: async ({
        method,
        params,
      }: {
        method: string;
        params?: unknown[];
      }) => {
        if (method !== "eth_sendTransaction")
          return provider.request({ method, params: params as unknown[] });
        if (sent)
          throw new Error("Transaction already submitted; do not resubmit");
        await assertWallet();
        beforeSend();
        update({ stage: "submitting" });
        const hash = await provider.request({
          method,
          params: params as unknown[],
        });
        sent = true;
        if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash))
          throw new Error("Wallet returned an invalid transaction hash");
        update({ stage: "submitted", evmHash: hash });
        return hash;
      },
    },
  });
  // No approval, transfer, label, or eligibility verdict is passed to the contract.
  // The contract checks the actual sender, current time, and current holding.
  const txId = await client.writeContract({
    address: voxenConfig.contract as `0x${string}`,
    functionName,
    args,
    value: 0n,
  });
  if (typeof txId !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txId))
    throw new Error("SDK returned an invalid transaction ID");
  update({ stage: "processing", txId });
}

export async function createProposal(
  form: ProposalForm,
  options: string[],
  wallet: string,
  update: WriteUpdate,
) {
  const args = createProposalArgs(form, options);
  await submitContractWrite(wallet, "create_proposal", args, update, () => {
    createProposalArgs(form, options);
  });
}
