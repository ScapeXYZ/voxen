/** Explicit application trust configuration for the active GenLayer network. */
export const ACTIVE_NETWORK = {
  contract: "0x08543c5E39EdA94E13Fb18A77bf865184c3BE691",
  rpc: "https://studio.genlayer.com/api",
  evmRpc: "https://rpc.testnet-chain.genlayer.com",
  chainId: 61999,
} as const;
export const voxenConfig = {
  contract: process.env.NEXT_PUBLIC_VOXEN_CONTRACT || ACTIVE_NETWORK.contract,
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC || ACTIVE_NETWORK.rpc,
  evmRpc: process.env.NEXT_PUBLIC_GENLAYER_EVM_RPC || ACTIVE_NETWORK.evmRpc,
  chainId: Number(
    process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || ACTIVE_NETWORK.chainId,
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
