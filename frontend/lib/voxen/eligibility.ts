import {
  createPublicClient,
  http,
  parseAbi,
  parseUnits,
  isAddress,
  type Address,
} from "viem";
import type { Eligibility } from "@/types/voxen";
import { voxenConfig } from "./config";
export const evmClient = createPublicClient({
  transport: http(voxenConfig.evmRpc, { timeout: 15_000, retryCount: 0 }),
});
const erc721 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);
const erc1155 = parseAbi([
  "function balanceOf(address account, uint256 id) view returns (uint256)",
]);
/** Balance preview only. cast_vote rechecks eligibility inside the contract. */
export async function verifyEligibility(
  wallet: string,
  requirement: Eligibility,
) {
  if (!isAddress(wallet) || /^0x0{40}$/i.test(wallet))
    throw new Error("Invalid wallet address");
  if (
    voxenConfig.chainId !== 4221 ||
    requirement.chainId !== 4221 ||
    (await evmClient.getChainId()) !== 4221
  )
    throw new Error("Unsupported eligibility network");
  let balance: bigint;
  let minimum = 1n;
  if (requirement.mode === "GEN_HOLDING") {
    minimum = parseUnits(requirement.minimum, 18);
    if (minimum <= 0n) throw new Error("Invalid minimum GEN balance");
    balance = await evmClient.getBalance({ address: wallet });
  } else {
    if (
      !isAddress(requirement.contract) ||
      /^0x0{40}$/i.test(requirement.contract)
    )
      throw new Error("Invalid credential contract");
    if (requirement.standard === "ERC721") {
      balance = await evmClient.readContract({
        address: requirement.contract as Address,
        abi: erc721,
        functionName: "balanceOf",
        args: [wallet],
      });
    } else {
      // Never interpret a friendly credential label as a token identifier.
      if (
        !requirement.tokenId ||
        !/^\d+$/.test(requirement.tokenId) ||
        BigInt(requirement.tokenId) >= 2n ** 256n
      )
        throw new Error("Invalid ERC1155 token ID");
      balance = await evmClient.readContract({
        address: requirement.contract as Address,
        abi: erc1155,
        functionName: "balanceOf",
        args: [wallet, BigInt(requirement.tokenId)],
      });
    }
  }
  return {
    eligible: balance >= minimum,
    observedBalance: balance.toString(),
    checkedAt: new Date().toISOString(),
  };
}
