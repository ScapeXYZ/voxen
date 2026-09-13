import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import { createPublicClient, http, parseAbi, parseEventLogs, type Hex, type Abi } from "viem";
import { voxenConfig } from "./config";
import { transactionStage, type VoteStage } from "./transaction-state";
const evmClient = createPublicClient({ transport: http(voxenConfig.evmRpc) });
const client = createClient({
  chain: {
    ...testnetBradbury,
    rpcUrls: { default: { http: [voxenConfig.rpc] } },
  },
});
export async function readVoteTransaction(hash: Hex, kind: "evm" | "genlayer") {
  let txId = hash;
  if (kind === "evm") {
    let receipt;
    try {
      receipt = await evmClient.getTransactionReceipt({ hash });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "TransactionReceiptNotFoundError"
      )
        return { stage: "submitted" as VoteStage };
      throw error;
    }
    if (receipt.status === "reverted")
      return {
        stage: "failed" as VoteStage,
        technical:
          "The EVM transaction reverted before entering GenLayer consensus.",
      };
    const consensus = testnetBradbury.consensusMainContract;
    if (!consensus) throw new Error("Missing Bradbury consensus configuration");
    const logs = receipt.logs.filter(
      (log) => log.address.toLowerCase() === consensus.address.toLowerCase(),
    );
    const events = parseEventLogs({
      abi: consensus.abi as Abi,
      eventName: "NewTransaction",
      logs,
    });
    // The SDK uses this same legacy event as its fallback.
    const fallback = parseEventLogs({
      abi: parseAbi([
        "event CreatedTransaction(bytes32 indexed txId, uint256 txSlot)",
      ]),
      logs,
    });
    txId =
      (events[0]?.args as { txId?: Hex } | undefined)?.txId ||
      (fallback[0]?.args.txId as Hex);
    if (!txId)
      throw new Error(
        "Receipt found but GenLayer transaction ID is unavailable. Do not resubmit.",
      );
  }
  const tx = await client.getTransaction({ hash: txId as TransactionHash });
  return {
    stage: transactionStage(tx),
    txId,
    technical: JSON.stringify(tx, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  };
}
