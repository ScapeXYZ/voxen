import { BRADBURY } from "./config";
/** Historical deployment evidence supplied by the project; not a current RPC read. */
export const liveProof = {
  network: "Bradbury",
  contract: BRADBURY.contract,
  badge: "0x9d7cDC2d47EdC8Fb697564F686cd028Db592504b",
  tokenId: "501",
  proposal: "proposal-3",
  title: "Voxen ERC1155 Holder Vote Proof",
  approve: 1,
  reject: 0,
  total: 1,
} as const;
