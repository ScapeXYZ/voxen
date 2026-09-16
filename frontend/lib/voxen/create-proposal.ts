import type { CalldataEncodable } from "genlayer-js/types";
import { voxenConfig } from "./config";
export const emptyProposalForm = {
  title: "",
  description: "",
  space: "",
  start: "",
  end: "",
  policy: "FINAL_ON_CAST",
  visibility: "LIVE",
  mode: "PUBLIC",
  poapEventId: "",
  label: "",
  poapMetadata: "",
  guard: false,
  evidence: "",
};
export type ProposalForm = typeof emptyProposalForm;
export function validateProposalForm(
  form: ProposalForm,
  options: string[],
  step: number,
  live = false,
): string {
  if (step === 0) {
    if (!form.title.trim() || !form.description.trim())
      return "Add a title and description.";
    if (live && form.space)
      return "This deployment only creates public proposals from this flow.";
  }
  if (
    step === 1 &&
    (options.length < 2 ||
      options.length > 6 ||
      options.some((o) => !o.trim()) ||
      new Set(options.map((o) => o.trim())).size !== options.length)
  )
    return "Provide 2–6 distinct, non-empty options.";
  if (step === 2) {
    const start = Date.parse(form.start),
      end = Date.parse(form.end);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end <= start
    )
      return "Choose a voting window where the end time is after the start time.";
    if (end <= Date.now())
      return "Choose a voting window that has not already ended.";
    if (
      !["LIVE", "HIDDEN_UNTIL_CLOSE"].includes(form.visibility) ||
      !["FINAL_ON_CAST", "CHANGE_UNTIL_CLOSE"].includes(form.policy)
    )
      return "Choose a valid result visibility and vote change policy.";
  }
  if (step === 3) {
    if (!["PUBLIC", "POAP_EVENT"].includes(form.mode))
      return "Choose one eligibility mode.";
    if (form.mode === "POAP_EVENT" && (!/^\d+$/.test(form.poapEventId) || BigInt(form.poapEventId) >= 2n ** 256n))
      return "Select a Portal POAP with public legacy verification.";
  }
  if (step === 0) {
    if (form.guard && (!form.space || live))
      return "Governance Guard requires a real Community. Public proposals must leave it off.";
    if (form.evidence) {
      try {
        if (!["http:", "https:"].includes(new URL(form.evidence).protocol))
          return "Use an HTTP or HTTPS supporting reference.";
      } catch {
        return "Enter a valid supporting reference.";
      }
    }
  }
  return "";
}
/** Exact positional ABI order from contracts/voxen.py#create_proposal. */
export function createProposalArgs(
  form: ProposalForm,
  options: string[],
): CalldataEncodable[] {
  for (let step = 0; step < 5; step++) {
    const error = validateProposalForm(form, options, step, true);
    if (error) throw new Error(error);
  }
  return [
    form.title,
    form.description,
    options,
    Math.floor(Date.parse(form.start) / 1000),
    Math.floor(Date.parse(form.end) / 1000),
    form.mode,
    null,
    form.evidence.trim() || null,
    false,
    form.visibility,
    form.policy,
    form.mode === "POAP_EVENT" ? BigInt(form.poapEventId) : null,
  ];
}
export function creationError(error: unknown) {
  const technical =
    error instanceof Error ? error.message : JSON.stringify(error);
  let message =
    "The proposal could not be created. Review the details and try again.";
  if (/4001|user rejected|user denied/i.test(technical))
    message = "You cancelled the transaction.";
  else if (/window|time range/i.test(technical))
    message =
      "Choose a voting window where the end time is after the start time, and has not already ended.";
  else if (/credential|token/i.test(technical))
    message = "Check the credential contract and token settings.";
  else if (/wallet changed/i.test(technical))
    message =
      "Your connected wallet changed. Check your account and try again.";
  else if (/network/i.test(technical))
    message = `Switch to ${voxenConfig.networkName} to create this proposal.`;
  return { message, technical };
}
export function smokeTestForm(): ProposalForm {
  const local = (ms: number) => {
    const date = new Date(ms);
    return new Date(ms - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return {
    ...emptyProposalForm,
    title: "Voxen Frontend Live Vote Test",
    description:
      `Live ${voxenConfig.networkName} proposal created from the Voxen frontend to verify proposal creation and voting.`,
    start: local(Date.now() - 60_000),
    end: local(Date.now() + 4 * 3600_000),
    mode: "POAP_EVENT",
    poapEventId: "226692",
    label: "GenLayer X AMA Participation #52",
    poapMetadata: "genlayer-x-ama-participation-52-226692",
  };
}
