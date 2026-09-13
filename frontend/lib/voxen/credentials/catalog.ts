import type { Credential } from "./types";
/** Curated deployment configuration. Add real credentials with canonical metadata here. */
export const credentialCatalog: Credential[] = [
  {
    id: "voxen:4221:holder:501",
    name: "Voxen ERC1155 Holder Credential",
    issuer: "Voxen",
    description:
      "Known Bradbury ERC1155 credential for the live voting smoke test.",
    verification: {
      mode: "ERC1155_TOKEN",
      chainId: 4221,
      contractAddress: "0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b",
      tokenId: "501",
      provider: "voxen-catalog",
      providerCredentialId:
        "4221:0x9d7cdc2d47edc8fb697564f686cd028db592504b:501",
    },
  },
];
