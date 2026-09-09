import { abi } from "genlayer-js";
export function voteError(error: unknown) {
  const technical =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  let reason = technical;
  const dump = /ReturnData:\[\]uint8\{([^}]+)\}/.exec(reason)?.[1];
  if (dump) {
    try {
      const value = abi.calldata.decode(
        Uint8Array.from(dump.match(/0x[0-9a-f]{1,2}/gi) || [], (n) =>
          parseInt(n, 16),
        ),
      );
      if (value instanceof Map && typeof value.get("data") === "string")
        reason = value.get("data") as string;
    } catch {
      /* Preserve the original diagnostic. */
    }
  }
  const messages: [RegExp, string][] = [
    [
      /Proposal is not OPEN|Proposal is not published|not currently open/i,
      "This proposal is not currently open for voting.",
    ],
    [
      /Outside voting window|Voting is not active/i,
      "Voting is not active right now.",
    ],
    [
      /Eligibility not verified|does not meet/i,
      "Your wallet does not meet this proposal's voting requirement.",
    ],
    [
      /Vote is final|already been recorded/i,
      "Your vote has already been recorded and cannot be changed.",
    ],
    [
      /Same option is a no-op/i,
      "Choose a different option to change your vote.",
    ],
    [
      /4001|user rejected|user denied/i,
      "You canceled the wallet request. No vote was submitted.",
    ],
    [
      /insufficient funds/i,
      "Your wallet needs enough GEN to cover the network fee.",
    ],
    [
      /wallet changed|account changed/i,
      "Your connected wallet changed. Check your account and try again.",
    ],
    [/network|chain mismatch/i, "Switch to GenLayer Bradbury to vote."],
  ];
  return {
    message:
      messages.find(([pattern]) => pattern.test(reason))?.[1] ||
      "We couldn't submit your vote. Try again.",
    technical,
  };
}
