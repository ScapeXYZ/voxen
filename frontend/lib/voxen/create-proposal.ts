import { credentialFields } from "./credentials/provider";
import { credentialCatalog } from "./credentials/catalog";
import { isAddress, parseUnits } from "viem";
import type { CalldataEncodable } from "genlayer-js/types";
export const emptyProposalForm = {
  title: "",
  description: "",
  space: "",
  start: "",
  end: "",
  policy: "FINAL_ON_CAST",
  visibility: "LIVE",
  mode: "GEN",
  minimum: "",
  contract: "",
  // Display-only metadata; never submitted to the reduced contract API.
  label: "",
  chain: "4221",
  standard: "ERC1155",
  token: "",
  credentialMetadata: "",
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
    if (!["GEN", "POAP_NFT"].includes(form.mode))
      return "Choose one eligibility mode.";
    if (form.mode === "GEN") {
      if (!/^\d+(\.\d{1,18})?$/.test(form.minimum))
        return "Enter a positive minimum GEN balance, up to 18 decimal places.";
      const wei = parseUnits(form.minimum, 18);
      if (wei <= 0n || wei >= 2n ** 256n)
        return "Enter a positive GEN balance within the supported range.";
    } else {
      if (form.credentialMetadata) {
        try {
          const canonical = credentialFields(
            JSON.parse(form.credentialMetadata),
          );
          if (
            Object.entries(canonical).some(
              ([key, value]) => form[key as keyof ProposalForm] !== value,
            )
          )
            return "Credential metadata changed. Select the credential again.";
        } catch (error) {
          return error instanceof Error
            ? error.message
            : "Invalid credential metadata.";
        }
      }
      if (
        !isAddress(form.contract) ||
        /^0x0{40}$/i.test(form.contract) ||
        !["ERC721", "ERC1155"].includes(form.standard)
      )
        return "Check the credential contract and token settings.";
      if (form.standard === "ERC721" && form.token)
        return "ERC721 collection eligibility does not accept a token ID.";
      if (
        form.standard === "ERC1155" &&
        (!/^\d+$/.test(form.token) || BigInt(form.token) >= 2n ** 256n)
      )
        return "Enter the numeric ERC1155 token ID supplied by the credential collection owner.";
    }
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
/** Exact positional order from contracts/voxen.py. UI GEN_HOLDING maps to contract GEN. */
export function createProposalArgs(
  form: ProposalForm,
  options: string[],
): CalldataEncodable[] {
  for (let step = 0; step < 5; step++) {
    const error = validateProposalForm(form, options, step, true);
    if (error) throw new Error(error);
  }
  const gen = form.mode === "GEN";
  return [
    form.title,
    form.description,
    options,
    Math.floor(Date.parse(form.start) / 1000),
    Math.floor(Date.parse(form.end) / 1000),
    gen ? "GEN" : "POAP_NFT",
    null,
    form.evidence.trim() || null,
    false,
    form.visibility,
    form.policy,
    gen ? parseUnits(form.minimum, 18) : null,
    gen ? null : form.contract,
    gen ? null : form.standard,
    !gen && form.standard === "ERC1155" ? BigInt(form.token) : null,
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
    message = "Switch to GenLayer Bradbury to create this proposal.";
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
      "Live Bradbury proposal created from the Voxen frontend to verify proposal creation and voting.",
    start: local(Date.now() - 60_000),
    end: local(Date.now() + 4 * 3600_000),
    mode: "POAP_NFT",
    ...credentialFields(credentialCatalog[0]),
  };
}
