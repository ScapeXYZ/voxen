"use client";
import { useState, useEffect } from "react";
import { Fingerprint } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import { checkEligibility, type EligibilityResult } from "@/lib/voxen/data";
import type { Eligibility } from "@/types/voxen";
export function EligibilityPanel({
  eligibility: e,
}: {
  eligibility: Eligibility;
}) {
  const wallet = useWallet();
  const [result, setResult] = useState<EligibilityResult>();
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let cancelled = false;
    setResult(undefined);
    setFailure("");
    setChecking(false);
    if (wallet.address && wallet.isOnCorrectNetwork) {
      setChecking(true);
      checkEligibility(wallet.address, e)
        .then((r) => {
          if (!cancelled) setResult(r);
        })
        .catch((err) => {
          if (!cancelled) setFailure(String(err));
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [wallet.address, wallet.chainId, wallet.isOnCorrectNetwork, e, retry]);
  return (
    <section className="eligibility-panel">
      <Fingerprint size={22} />
      <h3>Who can vote?</h3>
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
          ? "Connect your wallet to check whether you can vote. This sample cannot verify eligibility yet."
          : !wallet.isOnCorrectNetwork
            ? "Switch to GenLayer Bradbury to continue."
            : checking
              ? "Checking your voting eligibility…"
              : failure
                ? "We couldn't verify your voting eligibility. Try again."
                : result?.status === "eligible"
                  ? "You're eligible to vote."
                  : result?.status === "ineligible"
                    ? "You're not eligible for this proposal."
                    : "Eligibility unavailable: live checks are not connected for this sample."}
      </p>
      <WalletButton />
      {failure && (
        <>
          <button className="button" onClick={() => setRetry(retry + 1)}>
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
