"use client";

import { useQuery } from "@tanstack/react-query";

export function LiveReadStatus() {
  const query = useQuery({ queryKey: ["voxen-proof-read"], queryFn: async () => {
    const response = await fetch("/api/voxen/proposals?offset=0&limit=1", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "The configured deployment could not be read.");
    return body;
  }, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  if (query.isPending) return <p className="live-read" role="status">Checking the configured deployment…</p>;
  if (query.isError) return <div className="read-notice is-error" role="alert"><div><strong>Configured, not live-verified</strong><p>{query.error.message}</p></div><button className="button button-quiet" onClick={() => void query.refetch()}>Retry check</button></div>;
  return <div className="read-notice" role="status"><div><strong>Live read succeeded</strong><p>The configured contract responded to a proposal enumeration read. This confirms readability at the time of this check, not ongoing network health.</p></div><button className="button button-quiet" onClick={() => void query.refetch()}>Refresh</button></div>;
}
