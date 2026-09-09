"use client";
import { Fingerprint } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { Eligibility } from "@/types/voxen";
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
      <h3>{e.mode === "POAP_NFT" ? "Required credential" : "Who can vote?"}</h3>
      {e.mode === "POAP_NFT" && <strong className="wrap">{e.label}</strong>}
      <p>
        {e.mode === "GEN_HOLDING"
          ? `To vote, your wallet must hold at least ${e.minimum} GEN.`
          : e.standard === "ERC721"
            ? "To vote, your wallet must hold a credential from this collection."
            : "To vote, your wallet must hold the required credential token."}
      </p>
      <p className="small muted">
        {e.mode === "GEN_HOLDING"
          ? "GEN is not spent or locked. It is only used to verify eligibility."
          : `Required credential: ${e.label}. Your credential stays in your wallet.`}
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
            <dt>Chain ID</dt>
            <dd>{e.chainId}</dd>
            <dt>Standard</dt>
            <dd>{e.standard}</dd>
          </dl>
        </details>
      )}
      <p role="status">
        {!wallet.isConnected
          ? "Connect your wallet to check whether you can vote."
          : !wallet.isOnCorrectNetwork
            ? "Switch to GenLayer Bradbury to continue."
            : check?.isFetching
              ? e.mode === "POAP_NFT"
                ? "Checking credential ownership..."
                : "Checking your voting eligibility..."
              : failure
                ? "We couldn't verify your voting eligibility. Try again."
                : check?.data?.eligible === true
                  ? "Eligible to vote"
                  : check?.data?.eligible === false
                    ? e.mode === "POAP_NFT"
                      ? "This wallet does not hold the required credential."
                      : "You're not eligible for this proposal."
                    : live
                      ? e.mode === "POAP_NFT"
                        ? "Checking credential ownership..."
                        : "Checking your voting eligibility..."
                      : "Eligibility unavailable: live checks are not connected for this sample."}
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
            Observed balance: {check.data.observedBalance}
            {e.mode === "GEN_HOLDING" ? " wei" : " tokens"}. Checked{" "}
            {check.data.checkedAt}.
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
