"use client";
import { Fingerprint } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { Eligibility } from "@/types/voxen";
import { voxenConfig } from "@/lib/voxen/config";
import { eligibilityMessage } from "@/lib/voxen/eligibility-status";
export function EligibilityPanel({
  eligibility: e,
  live = false,
  check,
}: {
  eligibility: Eligibility;
  live?: boolean;
  check?: EligibilityCheck;
}) {
  const wallet = useWallet();
  const failure = check?.error?.message;
  return (
    <section className="eligibility-panel">
      <Fingerprint size={22} />
      <h3>{e.mode === "PUBLIC" || e.mode === "GEN" ? "Who can vote?" : "Required credential"}</h3>
      <p>
        {e.mode === "PUBLIC"
          ? "Public voting — anyone with a connected wallet can vote."
          : e.mode === "GEN"
          ? `To vote, your wallet must hold at least ${e.minimum} GEN.`
          : e.mode === "POAP_EVENT"
            ? `To vote, your wallet must hold the credential for POAP event ${e.eventId}.`
            : e.standard === "ERC721"
            ? "To vote, your wallet must hold a credential from this collection."
            : "To vote, your wallet must hold the required credential token."}
      </p>
      <p className="small muted">
        {e.mode === "PUBLIC"
          ? "The contract still verifies voting time, lifecycle, and one vote per wallet."
          : e.mode === "GEN"
          ? "GEN is not spent or locked. It is only used to verify eligibility."
          : "Your credential stays in your wallet; ownership is verified by the contract."}
      </p>
      <p className="small">
        These requirements keep voting limited to the community this decision
        affects.
      </p>
      {e.mode === "POAP_NFT" && (
        <details>
          <summary>Technical details</summary>
          <dl>
            <dt>Collection contract</dt>
            <dd className="wrap mono">{e.contract}</dd>
            {e.tokenId && (
              <>
                <dt>Token ID</dt>
                <dd>{e.tokenId}</dd>
              </>
            )}
            <dt>Standard</dt>
            <dd>{e.standard}</dd>
          </dl>
        </details>
      )}
      <p role="status">
        {!wallet.isConnected
          ? "Connect your wallet to check whether you can vote."
          : !wallet.isOnCorrectNetwork
            ? `Switch to ${voxenConfig.networkName} to continue.`
            : check?.isFetching
              ? e.mode === "POAP_EVENT" || e.mode === "POAP_NFT"
                ? "Checking credential ownership..."
                : "Checking your voting eligibility..."
              : failure
                ? "We couldn't verify your voting eligibility. Try again."
                : eligibilityMessage(check?.data?.eligible, check?.data?.status, e.mode === "POAP_EVENT" || e.mode === "POAP_NFT")
                  ?? (check?.data?.eligible === false
                    ? "You're not eligible for this proposal."
                    : live
                      ? e.mode === "POAP_EVENT" || e.mode === "POAP_NFT"
                        ? "Checking credential ownership..."
                        : "Checking your voting eligibility..."
                      : "Eligibility unavailable: live checks are not connected for this sample.")}
      </p>
      {live && (
        <p className="small muted">
          This is a balance preview. The contract checks your eligibility again
          when your vote executes. Network fees may apply.
        </p>
      )}
      {check?.data && (
        <details>
          <summary>Verification details</summary>
          <p className="small">
            Observed balance: {check.data.observed_balance}
            {e.mode === "GEN" ? " wei" : " tokens"}. Verification: {check.data.verification_status}.
          </p>
        </details>
      )}
      <WalletButton />
      {failure && (
        <>
          <button className="button" onClick={() => void check?.refetch()}>
            Try again
          </button>
          <details>
            <summary>View technical details</summary>
            <p className="wrap">{failure}</p>
          </details>
        </>
      )}
    </section>
  );
}
