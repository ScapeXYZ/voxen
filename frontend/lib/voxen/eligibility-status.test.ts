import { describe, expect, it } from "vitest";
import { eligibilityMessage, votingEligibilityReason } from "./eligibility-status";

describe("POAP eligibility status", () => {
  it("renders a confirmed public eligibility result", () => {
    expect(eligibilityMessage(true, "PUBLIC_ELIGIBLE", false)).toBe("Eligible to vote");
    expect(votingEligibilityReason(true, "PUBLIC_ELIGIBLE")).toBe("");
  });
  it("shows a credential message only for a confirmed non-match", () => {
    expect(eligibilityMessage(false, "POAP_NO_MATCHING_EVENT", true))
      .toBe("This wallet does not hold the required credential.");
    expect(eligibilityMessage(false, "POAP_RPC_UNAVAILABLE", true))
      .toBe("POAP verification is temporarily unavailable. Try again.");
  });

  it("keeps voting disabled when POAP verification is unavailable", () => {
    expect(votingEligibilityReason(false, "POAP_RPC_UNAVAILABLE"))
      .toBe("POAP verification is temporarily unavailable. Try again.");
    expect(votingEligibilityReason(true, "POAP_RPC_UNAVAILABLE")).not.toBe("");
  });
});
