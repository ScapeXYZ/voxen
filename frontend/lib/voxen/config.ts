/** Explicit application trust configuration for the active GenLayer network. */
export const ACTIVE_NETWORK = {
  name: "Studio Next",
  contract: "0x3da4C8759A6D0a948C918969b63bd59d44bC588F",
  rpc: "https://studio-next.genlayer.com/api",
  evmRpc: "https://studio-next.genlayer.com/api",
  chainId: 61997,
} as const;
export const voxenConfig = {
  networkName: process.env.NEXT_PUBLIC_GENLAYER_NETWORK_NAME || ACTIVE_NETWORK.name,
  contract: process.env.NEXT_PUBLIC_VOXEN_CONTRACT || ACTIVE_NETWORK.contract,
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC || ACTIVE_NETWORK.rpc,
  evmRpc: process.env.NEXT_PUBLIC_GENLAYER_EVM_RPC || ACTIVE_NETWORK.evmRpc,
  chainId: Number(
    process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || ACTIVE_NETWORK.chainId,
  ),
};
export const voxenNetworkLabel = `${voxenConfig.networkName} (${voxenConfig.chainId})`;
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
