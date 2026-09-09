"use client";
import { useState } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { Wallet } from "lucide-react";
export function WalletButton() {
  const w = useWallet();
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  async function connect() {
    setFailure("");
    try {
      await w.connectWallet();
    } catch (err) {
      setFailure(String(err));
    }
  }
  return (
    <div className="wallet-control">
      {w.isConnected && w.address ? (
        <details className="wallet-menu">
          <summary className="button wallet-button">
            <Wallet size={15} />
            {w.address.slice(0, 6)}…{w.address.slice(-4)}
          </summary>
          <div className="wallet-actions">
            <span>Connected wallet</span>
            <button
              className="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(w.address!);
                  setMessage("Address copied");
                } catch {
                  setMessage(
                    "Could not copy. Select the address below to copy it.",
                  );
                }
              }}
            >
              Copy address
            </button>
            <span className="mono wrap">{w.address}</span>
            <button
              className="button"
              onClick={() => {
                w.disconnectWallet();
                setMessage("");
              }}
            >
              Disconnect
            </button>
            {!w.isOnCorrectNetwork && (
              <button
                className="button"
                disabled={w.isLoading}
                onClick={connect}
              >
                Switch to GenLayer Bradbury
              </button>
            )}
            <span role="status">{message}</span>
          </div>
        </details>
      ) : (
        <button
          className="button wallet-button"
          disabled={w.isLoading}
          onClick={connect}
        >
          <Wallet size={15} />
          {w.isLoading ? "Connecting…" : "Connect wallet"}
        </button>
      )}
      {failure && (
        <div className="wallet-error" role="alert">
          <p>
            {w.isMetaMaskInstalled
              ? "We couldn't connect your wallet. Check your wallet and try again."
              : "Install MetaMask to connect a wallet, then refresh this page."}
          </p>
          <details>
            <summary>View technical details</summary>
            <p className="wrap">{failure}</p>
          </details>
        </div>
      )}
    </div>
  );
}
