"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { voxenConfig } from "@/lib/voxen/config";
import { submitVote } from "@/lib/voxen/writes";
import { voteError } from "@/lib/voxen/errors";
import type { VoteStage } from "@/lib/voxen/transaction-state";

type VoteState = {
  stage: VoteStage;
  evmHash?: string;
  txId?: string;
  message?: string;
  technical?: string;
};
const idle: VoteState = { stage: "idle" };
const states = new Map<string, VoteState>();
const listeners = new Set<() => void>();
const running = new Set<string>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function save(key: string, state: VoteState) {
  states.set(key, state);
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* In-memory tracking still works. */
  }
  listeners.forEach((listener) => listener());
}
export function useVoxenVote(id: string) {
  const wallet = useWallet();
  const cache = useQueryClient();
  const key = `voxen:vote:${voxenConfig.rpc}:${voxenConfig.contract}:${id}:${wallet.address?.toLowerCase() || "disconnected"}`;
  const state = useSyncExternalStore(
    subscribe,
    () => states.get(key) || idle,
    () => idle,
  );
  useEffect(() => {
    if (states.has(key)) return;
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(key) || "null",
      ) as VoteState | null;
      // Persist only submitted references, never trust a stored success label.
      if (
        stored &&
        [stored.txId, stored.evmHash].some((hash) =>
          /^0x[0-9a-fA-F]{64}$/.test(hash || ""),
        )
      )
        save(key, {
          stage: stored.txId ? "processing" : "submitted",
          txId: stored.txId,
          evmHash: stored.evmHash,
        });
    } catch {
      /* No resumable transaction. */
    }
  }, [key]);
  const hash = state.txId || state.evmHash;
  const kind = state.txId ? "genlayer" : "evm";
  const status = useQuery({
    queryKey: ["voxen-transaction", key, hash, kind],
    queryFn: async () => {
      const response = await fetch(
        `/api/voxen/transactions/${hash}?kind=${kind}`,
        { cache: "no-store", signal: AbortSignal.timeout(25_000) },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.technical || body.message);
      return body as { stage: VoteStage; txId?: string; technical?: string };
    },
    enabled: !!hash && state.stage !== "finalized" && state.stage !== "failed",
    retry: false,
    refetchInterval:
      state.stage === "finalized" || state.stage === "failed" ? false : 4000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!status.data) return;
    const previous = states.get(key) || idle;
    const next = status.data;
    save(key, {
      ...previous,
      ...next,
      message:
        next.stage === "failed"
          ? "Your vote failed and was not recorded."
          : undefined,
    });
    if (
      ["accepted", "finalized", "failed"].includes(next.stage) &&
      next.stage !== previous.stage
    ) {
      // Includes tallies, proposal lifecycle and the current wallet's ballot.
      void cache.invalidateQueries({
        queryKey: ["voxen-proposal", voxenConfig.rpc, voxenConfig.contract, id],
      });
      void cache.invalidateQueries({
        queryKey: ["voxen-vote", voxenConfig.rpc, voxenConfig.contract, id],
      });
      void cache.invalidateQueries({ queryKey: ["voxen-eligibility"] });
    }
  }, [status.data, key, cache, id]);
  const pending = [
    "preparing",
    "submitting",
    "submitted",
    "processing",
  ].includes(state.stage);
  async function cast(optionIndex: number) {
    if (
      !wallet.address ||
      !wallet.isOnCorrectNetwork ||
      running.has(key) ||
      ["preparing", "submitting", "submitted", "processing"].includes(
        (states.get(key) || idle).stage,
      )
    )
      return;
    running.add(key);
    save(key, { stage: "preparing" });
    try {
      await submitVote(id, wallet.address, optionIndex, (update) => {
        const previous = states.get(key) || idle;
        save(key, {
          ...previous,
          ...update,
          stage: ["accepted", "finalized", "failed"].includes(previous.stage)
            ? previous.stage
            : update.stage,
        });
      });
    } catch (error) {
      const previous = states.get(key) || idle;
      const details = voteError(error);
      // A receipt/transport timeout after broadcast is not a failed vote.
      save(
        key,
        previous.evmHash || previous.txId
          ? { ...previous, technical: details.technical }
          : { stage: "failed", ...details },
      );
    } finally {
      running.delete(key);
    }
  }
  return {
    ...state,
    pending,
    cast,
    monitoringError: status.error?.message,
    retryStatus: status.refetch,
  };
}
export type VoteController = ReturnType<typeof useVoxenVote>;
