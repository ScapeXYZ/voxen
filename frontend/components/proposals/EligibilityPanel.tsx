"use client";
import { Fingerprint } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import type { EligibilityCheck } from "@/hooks/useVoxenEligibility";
import type { Eligibility } from "@/types/voxen";
import { voxenConfig } from "@/lib/voxen/config";
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
  const credential = e.mode === "POAP_EVENT" || e.mode === "POAP_NFT";
  const status = !wallet.isConnected ? "Connect a wallet to check" : !wallet.isOnCorrectNetwork ? `Switch to ${voxenConfig.networkName} to check` : check?.isFetching ? "Checking eligibility" : failure ? "Verification is temporarily unavailable" : check?.data?.eligible ? "You can vote" : check?.data?.eligible === false ? "This wallet is not eligible" : "Eligibility check is pending";
  return (
    <section className="eligibility-panel" aria-labelledby="eligibility-heading">
      <div className="panel-heading"><Fingerprint size={21} /><div><h2 id="eligibility-heading">Eligibility</h2><p className="eligibility-status" role="status">{status}</p></div></div>
      <p>
        {e.mode === "PUBLIC"
          ? "Public voting — anyone with a connected wallet can vote."
          : e.mode === "GEN"
          ? `To vote, your wallet must hold at least ${e.minimum} GEN.`
          : e.mode === "POAP_EVENT"
            ? `Experimental POAP check: your wallet must hold the credential for event ${e.eventId}.`
            : e.standard === "ERC721"
            ? "To vote, your wallet must hold a credential from this collection."
            : "To vote, your wallet must hold the required credential token."}
      </p>
      <p className="eligibility-explainer">
        {e.mode === "PUBLIC"
          ? "Any connected wallet can vote while voting is open. The contract enforces one wallet, one final vote."
          : e.mode === "GEN"
          ? "GEN is not spent or locked. It is only used to verify eligibility."
          : "Your credential stays in your wallet; ownership is verified by the contract."}
      </p>
      {credential && <p className="eligibility-note">Credential verification is fail-closed: an unavailable verification service does not mean a credential is missing.</p>}
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
      {live && (
        <p className="eligibility-note">
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
