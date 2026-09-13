"use client";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { voxenConfig } from "@/lib/voxen/config";
import { fetchEligibility } from "@/lib/voxen/eligibility-client";
export function useVoxenEligibility(id?: string) {
  const wallet = useWallet();
  return useQuery({
    queryKey: [
      "voxen-eligibility",
      voxenConfig.rpc,
      voxenConfig.evmRpc,
      voxenConfig.contract,
      id,
      wallet.address,
      wallet.chainId,
    ],
    queryFn: () => fetchEligibility(id!, wallet.address!),
    enabled: !!id && !!wallet.address && wallet.isOnCorrectNetwork,
    retry: false,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
export type EligibilityCheck = ReturnType<typeof useVoxenEligibility>;
