"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LiveProposal, getVote } from "@/lib/voxen/reads";
import { voxenConfig } from "@/lib/voxen/config";
export class LiveReadError extends Error {
  constructor(
    message: string,
    public state: "error" | "unavailable",
  ) {
    super(message);
  }
}
async function fetchRead<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new LiveReadError(
      body.message || "Live read failed.",
      body.state === "unavailable" ? "unavailable" : "error",
    );
  return body;
}
const configKey = [voxenConfig.rpc, voxenConfig.contract];
export function useVoxenProposal(id: string) {
  const query = useQuery({
    refetchInterval: 15000,
    queryKey: ["voxen-proposal", ...configKey, id],
    queryFn: () =>
      fetchRead<LiveProposal>(`/api/voxen/proposals/${encodeURIComponent(id)}`),
    retry: false,
    staleTime: 0,
  });
  const start = query.data?.timeWindow.start;
  const end = query.data?.timeWindow.end;
  const { refetch } = query;
  useEffect(() => {
    const timers = [start, end].filter((t): t is number => t !== undefined && t * 1000 > Date.now())
      .map((t) => setTimeout(() => void refetch(), Math.min(t * 1000 - Date.now() + 50, 2147483647)));
    return () => timers.forEach(clearTimeout);
  }, [start, end, refetch]);
  return query;
}
export function useVoxenRecordedVote(id: string, wallet: string | null) {
  return useQuery({
    queryKey: ["voxen-vote", ...configKey, id, wallet],
    queryFn: () =>
      fetchRead<{ vote: Awaited<ReturnType<typeof getVote>> }>(
        `/api/voxen/proposals/${encodeURIComponent(id)}?wallet=${encodeURIComponent(wallet!)}`,
      ),
    enabled: !!wallet,
    retry: false,
    staleTime: 0,
  });
}
