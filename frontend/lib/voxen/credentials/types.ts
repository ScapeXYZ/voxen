export interface Credential {
  id: string;
  name: string;
  issuer?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  issuedCount?: number;
  verification: {
    mode: "ERC721_COLLECTION" | "ERC1155_TOKEN" | "POAP_EVENT";
    chainId: number;
    contractAddress?: string;
    tokenId?: string | number;
    provider: string;
    providerCredentialId: string;
  };
}
export interface CredentialProvider {
  id: string;
  search(query: string, signal?: AbortSignal): Promise<Credential[]>;
}
