/** Explicit application trust configuration; wallet chain ID alone does not identify Bradbury. */
export const BRADBURY = {
  contract: "0xA7c7B3F81dbbC511029a9A07FDfBf97dC1A822f7",
  rpc: "https://rpc-bradbury.genlayer.com",
  evmRpc: "https://rpc.testnet-chain.genlayer.com",
  chainId: 4221,
} as const;
export const voxenConfig = {
  contract: process.env.NEXT_PUBLIC_VOXEN_CONTRACT || BRADBURY.contract,
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC || BRADBURY.rpc,
  evmRpc: process.env.NEXT_PUBLIC_GENLAYER_EVM_RPC || BRADBURY.evmRpc,
  chainId: Number(
    process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || BRADBURY.chainId,
  ),
};
if (
  !/^0x[0-9a-fA-F]{40}$/.test(voxenConfig.contract) ||
  !Number.isSafeInteger(voxenConfig.chainId) ||
  voxenConfig.chainId <= 0
)
  throw new Error("Invalid Voxen public configuration");
for (const rpc of [voxenConfig.rpc, voxenConfig.evmRpc]) {
  if (!["https:", "http:"].includes(new URL(rpc).protocol))
    throw new Error("Invalid RPC URL");
}
