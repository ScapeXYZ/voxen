export type PoapEligibilityStatus =
  | "PUBLIC_ELIGIBLE"
  | "POAP_NO_MATCHING_EVENT"
  | "POAP_RPC_UNAVAILABLE"
  | string
  | undefined;

export function eligibilityMessage(
  eligible: boolean | undefined,
  status: PoapEligibilityStatus,
  credential: boolean,
) {
  if (status === "PUBLIC_ELIGIBLE" && eligible === true) return "Eligible to vote";
  if (status === "POAP_RPC_UNAVAILABLE")
    return "POAP verification is temporarily unavailable. Try again.";
  if (credential && status === "POAP_NO_MATCHING_EVENT")
    return "This wallet does not hold the required credential.";
  if (eligible === true) return "Eligible to vote";
  if (eligible === false) return "You're not eligible for this proposal.";
  return undefined;
}

export function votingEligibilityReason(
  eligible: boolean | undefined,
  status: PoapEligibilityStatus,
) {
  if (status === "POAP_RPC_UNAVAILABLE")
    return "POAP verification is temporarily unavailable. Try again.";
  return eligible ? "" : "Your wallet does not meet this proposal's requirement.";
}
