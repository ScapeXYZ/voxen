import type { GenLayerTransaction } from "genlayer-js/types";
export type VoteStage =
  | "idle"
  | "preparing"
  | "submitting"
  | "submitted"
  | "processing"
  | "accepted"
  | "finalized"
  | "failed";
export const voteStageLabels: Record<VoteStage, string> = {
  idle: "",
  preparing: "Preparing vote",
  submitting: "Waiting for wallet approval",
  submitted: "Transaction submitted",
  processing: "GenLayer consensus processing",
  accepted: "GenLayer consensus processing",
  finalized: "Finalized",
  failed: "Failed",
};
/** Never infer execution success from consensus status alone. SDK 2.0.0-rc.1: 5 Accepted, 7 Finalized. */
export function transactionStage(tx: GenLayerTransaction): VoteStage {
  const status =
    typeof tx.status === "number" ? tx.status : tx.statusName || tx.status;
  const decided = [
    5,
    7,
    "ACCEPTED",
    "FINALIZED",
  ].includes(status ?? "");
  if (
    status === 8 ||
    status === "CANCELED" ||
    (decided &&
      (tx.txExecutionResult === 2 ||
        tx.txExecutionResultName === "FINISHED_WITH_ERROR"))
  )
    return "failed";
  const success =
    tx.txExecutionResult === 1 ||
    tx.txExecutionResultName === "FINISHED_WITH_RETURN";
  if (success && (status === 7 || status === "FINALIZED")) return "finalized";
  if (success && (status === 5 || status === "ACCEPTED")) return "processing";
  return "processing";
}
