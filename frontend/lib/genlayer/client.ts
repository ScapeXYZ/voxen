"use client";

import { voxenConfig } from "@/lib/voxen/config";
import { studioDevnet } from "genlayer-js/chains";

export const GENLAYER_CHAIN_ID = voxenConfig.chainId;
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16)}`;
export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: voxenConfig.networkName,
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [voxenConfig.evmRpc],
};
// Studio Next shares Studio Devnet's consensus contract configuration in this
// SDK release, while using Voxen's explicit RPC endpoint and chain id.
export const GENLAYER_CHAIN = {
  ...studioDevnet,
  id: GENLAYER_CHAIN_ID,
  name: voxenConfig.networkName,
  rpcUrls: { default: { http: [voxenConfig.rpc] } },
} satisfies typeof studioDevnet;

// Ethereum provider type from window
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum?.isMetaMask;
}

/**
 * Get the Ethereum provider (MetaMask)
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

/**
 * Request accounts from MetaMask
 * @returns Array of addresses
 */
export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });
    return accounts;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected the connection request");
    }
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
}

/**
 * Get current MetaMask accounts without requesting permission
 * @returns Array of addresses
 */
export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();

  if (!provider) {
    return [];
  }

  try {
    const accounts = await provider.request({
      method: "eth_accounts",
    });
    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

/**
 * Get the current chain ID from MetaMask
 */
export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();

  if (!provider) {
    return null;
  }

  try {
    const chainId = await provider.request({
      method: "eth_chainId",
    });
    return chainId;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
}

/**
 * Add GenLayer network to MetaMask
 */
export async function addGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected adding the network");
    }
    throw new Error(`Failed to add GenLayer network: ${error.message}`);
  }
}

/**
 * Switch to GenLayer network
 */
export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });
  } catch (error: any) {
    // If the chain is not added, add it
    if (error.code === 4902) {
      await addGenLayerNetwork();
    } else if (error.code === 4001) {
      throw new Error("User rejected switching the network");
    } else {
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

/**
 * Check if we're on the GenLayer network
 */
export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();

  if (!chainId) {
    return false;
  }

  // Convert both to decimal for comparison
  const currentChainIdDecimal = parseInt(chainId, 16);
  return currentChainIdDecimal === GENLAYER_CHAIN_ID;
}

/**
 * Connect to MetaMask and ensure we're on GenLayer network
 * @returns The connected address
 */
export async function connectMetaMask(): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }

  // Request accounts
  const accounts = await requestAccounts();

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found");
  }

  // Check and switch to GenLayer network
  const onCorrectNetwork = await isOnGenLayerNetwork();

  if (!onCorrectNetwork) {
    await switchToGenLayerNetwork();
  }

  return accounts[0];
}

/**
 * Request user to switch MetaMask account
 * Shows MetaMask account picker even if already connected
 * Uses wallet_requestPermissions to force account selection dialog
 * @returns The newly selected account address
 */
export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed");
  }

  try {
    // Request permissions - this shows account picker
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    // Get the newly selected account
    const accounts = await provider.request({
      method: "eth_accounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No account selected");
    }

    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected account switch");
    } else if (error.code === -32002) {
      throw new Error("Account switch request already pending");
    }
    throw new Error(`Failed to switch account: ${error.message}`);
  }
}
