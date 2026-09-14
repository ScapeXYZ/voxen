import { abi, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import { voxenConfig } from "./config";

// No account or wallet provider: this boundary exposes read operations only.
const client = createClient({
  chain: {
    ...studionet,
    id: voxenConfig.chainId,
    rpcUrls: { default: { http: [voxenConfig.rpc] } },
  },
});
export async function readVoxen(
  functionName:
    | "get_proposal_ids"
    | "get_proposal"
    | "get_proposal_eligibility"
    | "get_proposal_tallies"
    | "get_proposal_result"
    | "check_eligibility"
    | "get_space"
    | "get_governance_review"
    | "get_latest_governance_review",
  args: (string | number)[],
): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      client.readContract({
        address: voxenConfig.contract as `0x${string}`,
        functionName,
        args,
        jsonSafeReturn: true,
        transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Studio read timed out")),
          20_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Studio currently embeds GenVM UserError calldata in a Go byte dump.
 * The SDK leaves this error undecoded. Only a decoded, exact missing-ID
 * error is classified as unavailable; other RPC failures stay errors.
 */
export function isMissingProposal(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unknown proposal ID") return true;
  const dump = /ReturnData:\[\]uint8\{([^}]+)\}/.exec(message)?.[1];
  if (!dump || !/^(?:\s*0x[0-9a-f]{1,2}\s*,?)+$/i.test(dump)) return false;
  try {
    const bytes = Uint8Array.from(dump.match(/0x[0-9a-f]{1,2}/gi)!, (n) =>
      parseInt(n, 16),
    );
    const decoded = abi.calldata.decode(bytes);
    return (
      decoded instanceof Map &&
      decoded.get("kind") === "UserError" &&
      decoded.get("data") === "Unknown proposal ID"
    );
  } catch {
    return false;
  }
}
