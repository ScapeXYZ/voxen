"use client";
import { Copy } from "lucide-react";
import { useState } from "react";
export function AddressDisplay({
  address,
  compact = false,
}: {
  address: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span className="address">
      <code>
        {compact ? `${address.slice(0, 6)}…${address.slice(-4)}` : address}
      </code>
      <button
        aria-label="Copy address"
        title="Copy address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            setError(true);
          }
        }}
      >
        <Copy size={13} />
      </button>
      <span role="status">
        {copied ? "Copied" : error ? "Copy unavailable" : ""}
      </span>
    </span>
  );
}
