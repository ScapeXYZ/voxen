import { ACTIVE_NETWORK } from "./config";
/** Active deployment metadata; the vote evidence fields below are historical. */
export const liveProof = {
  network: ACTIVE_NETWORK.name,
  contract: ACTIVE_NETWORK.contract,
  deploymentTransaction: "0x0c060f3b89c53bc91ad1580c24a9abeca3482de10c955089b705f19ce25236b8",
  badge: "0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b",
  tokenId: "501",
  proposal: "proposal-3",
  title: "Voxen ERC1155 Holder Vote Proof",
  approve: 1,
  reject: 0,
  total: 1,
} as const;
