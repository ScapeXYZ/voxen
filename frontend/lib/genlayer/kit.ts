"use client";

import { useMemo } from "react";
import {
  createTransactionKit,
  type TransactionKit,
} from "@genlayer/transaction-kit";
import { GENLAYER_CHAIN, getEthereumProvider } from "./client";

/** Build an RC2 kit bound to the currently selected injected-wallet account. */
export function createVoxenTransactionKit(
  address: string,
): TransactionKit {
  const provider = getEthereumProvider();
  if (!provider || !address.startsWith("0x"))
    throw new Error("Connect your wallet first");

  return createTransactionKit({
    chain: GENLAYER_CHAIN,
    provider,
    account: address as `0x${string}`,
  });
}

/**
 * React-facing variant used by transaction review UI.  Keeping the kit stable
 * for an address is important: RC2 re-estimates whenever the kit changes.
 */
export function useVoxenTransactionKit(
  address: string | null,
): TransactionKit | null {
  return useMemo(() => {
    if (!address?.startsWith("0x")) return null;
    try {
      return createVoxenTransactionKit(address);
    } catch {
      return null;
    }
  }, [address]);
}
