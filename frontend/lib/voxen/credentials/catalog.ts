import type { Credential } from "./types";
import { voxenConfig } from "../config";
/** Curated deployment configuration. Add real credentials with canonical metadata here. */
export const credentialCatalog: Credential[] = [
  {
    id: `voxen:${voxenConfig.chainId}:holder:501`,
    name: "Voxen ERC1155 Holder Credential",
    issuer: "Voxen",
    description:
      `Known ${voxenConfig.networkName} ERC1155 credential for the live voting smoke test.`,
    verification: {
      mode: "ERC1155_TOKEN",
      chainId: voxenConfig.chainId,
      contractAddress: "0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b",
      tokenId: "501",
      provider: "voxen-catalog",
      providerCredentialId:
        `${voxenConfig.chainId}:0x9d7cdc2d47edc8fb697564f686cd028db592504b:501`,
    },
  },
];
