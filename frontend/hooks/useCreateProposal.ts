"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { voxenConfig } from "@/lib/voxen/config";
import { createProposal } from "@/lib/voxen/writes";
import { creationError, type ProposalForm } from "@/lib/voxen/create-proposal";
import type { VoteStage } from "@/lib/voxen/transaction-state";

type CreationState = {
  stage: VoteStage;
  evmHash?: string;
  txId?: string;
  message?: string;
  technical?: string;
};
const idle: CreationState = { stage: "idle" };
const states = new Map<string, CreationState>();
const listeners = new Set<() => void>();
const running = new Set<string>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function save(key: string, state: CreationState) {
  states.set(key, state);
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* In-memory tracking still works. */
  }
  listeners.forEach((listener) => listener());
}
export function useCreateProposal() {
  const wallet = useWallet();
  const key = `voxen:create:${voxenConfig.rpc}:${voxenConfig.contract}:${wallet.address?.toLowerCase() || "disconnected"}`;
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
      ) as CreationState | null;
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
  const pending = [
    "preparing",
    "submitting",
    "submitted",
    "processing",
  ].includes(state.stage);
  async function submit(form: ProposalForm, options: string[]) {
    if (
      !wallet.address ||
      !wallet.isOnCorrectNetwork ||
      running.has(key) ||
      ["accepted", "finalized"].includes((states.get(key) || idle).stage) ||
      ["preparing", "submitting", "submitted", "processing"].includes(
        (states.get(key) || idle).stage,
      )
    )
      return;
    running.add(key);
    save(key, { stage: "preparing" });
    try {
      await createProposal(form, options, wallet.address, (update) => {
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
      const details = creationError(error);
      // A receipt/transport timeout after broadcast is not a failed creation.
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
    submit,
    startAnother: () => {
      if (["accepted", "finalized"].includes(state.stage) && !running.has(key))
        save(key, idle);
    },
    monitoringError: undefined,
    retryStatus: async () => undefined,
  };
}
export type CreateController = ReturnType<typeof useCreateProposal>;
