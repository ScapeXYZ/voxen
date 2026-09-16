"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyValue({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  const [message, setMessage] = useState("");
  const display = compact && value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage("Copied"); }
    catch { setMessage("Copy unavailable"); }
    window.setTimeout(() => setMessage(""), 1800);
  }
  return <span className="copy-value"><code title={value}>{display}</code><button type="button" onClick={() => void copy()} aria-label={`Copy ${label}`} title={`Copy ${label}`}><Copy aria-hidden="true" size={15} /></button><span className="sr-only" role="status" aria-live="polite">{message}</span></span>;
}
