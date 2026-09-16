import { isAddress } from "viem";
import { credentialCatalog } from "./catalog";
import type { Credential, CredentialProvider } from "./types";
import { voxenConfig, voxenNetworkLabel } from "../config";

export function createCatalogProvider(
  catalog: readonly Credential[],
): CredentialProvider {
  return {
    id: "voxen-catalog",
    async search(query, signal) {
      signal?.throwIfAborted();
      const words = query.trim().toLocaleLowerCase().split(/\s+/);
      return catalog.filter((c) =>
        words.every((word) =>
          `${c.name} ${c.issuer ?? ""}`.toLocaleLowerCase().includes(word),
        ),
      );
    },
  };
}
export const credentialProvider = createCatalogProvider(credentialCatalog);

/** Fail closed: event IDs are never converted into token IDs or collection-wide checks. */
export function credentialProblem(c: Credential): string {
  const v = c?.verification;
  if (!c?.id || !c?.name?.trim() || !v?.provider || !v.providerCredentialId)
    return "Missing canonical verification metadata.";
  if (!["ERC721_COLLECTION", "ERC1155_TOKEN"].includes(v.mode))
    return "Unsupported credential representation. POAP event ownership cannot be verified by the current contract.";
  if (v.chainId !== voxenConfig.chainId)
    return `Unsupported chain. Voting currently verifies credentials on ${voxenNetworkLabel} only.`;
  if (
    !v.contractAddress ||
    !isAddress(v.contractAddress) ||
    /^0x0{40}$/i.test(v.contractAddress)
  )
    return "Missing or invalid credential contract address.";
  if (v.mode === "ERC721_COLLECTION" && v.tokenId != null)
    return "Unsupported ERC721 token-specific ownership. Only collection ownership is supported.";
  if (v.mode === "ERC1155_TOKEN") {
    const token = String(v.tokenId ?? "");
    if (
      (typeof v.tokenId === "number" && !Number.isSafeInteger(v.tokenId)) ||
      !/^\d+$/.test(token) ||
      BigInt(token) >= 2n ** 256n
    )
      return "Missing or invalid canonical ERC1155 token ID.";
  }
  return "";
}
export function credentialFields(c: Credential) {
  const problem = credentialProblem(c);
  if (problem) throw new Error(problem);
  return {
    contract: c.verification.contractAddress!,
    label: c.name,
    chain: String(c.verification.chainId),
    standard:
      c.verification.mode === "ERC721_COLLECTION" ? "ERC721" : "ERC1155",
    token:
      c.verification.mode === "ERC1155_TOKEN"
        ? String(c.verification.tokenId)
        : "",
    credentialMetadata: JSON.stringify(c),
  };
}
