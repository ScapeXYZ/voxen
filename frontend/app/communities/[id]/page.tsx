"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { AddressDisplay } from "@/components/governance/AddressDisplay";
import { CopyValue } from "@/components/governance/CopyValue";
import { voxenConfig } from "@/lib/voxen/config";

export default function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ["voxen-community", id],
    queryFn: async () => {
      const response = await fetch(`/api/voxen/communities/${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Community unavailable.");
      return body as { id: string; name: string; description: string; owner: string; governanceRules: string; guardEnabled: boolean; active: boolean };
    }, retry: false,
  });
  return <main id="main" className="shell page">
    <Link href="/communities" className="eyebrow">← COMMUNITIES</Link>
    {query.isPending && <section className="community-message panel" role="status">Loading Community from {voxenConfig.networkName}…</section>}
    {query.isError && <section className="community-message panel" role="alert"><h2>Community unavailable</h2><p>{query.error.message}</p><button className="button" onClick={() => void query.refetch()}>Retry read</button></section>}
    {query.data && <div className="community-detail"><span className="eyebrow">Live Community</span><h1>{query.data.name}</h1><p>{query.data.description || "No description was provided."}</p><div className="community-id"><span>Community ID</span><CopyValue label="Community ID" value={query.data.id} /></div><section className="community-detail-grid"><article className="panel"><h2>Community information</h2><dl className="metadata-grid"><div><dt>Status</dt><dd>{query.data.active ? "Active" : "Inactive"}</dd></div><div><dt>Owner</dt><dd><AddressDisplay address={query.data.owner} compact /></dd></div></dl></article><article className="panel"><h2>Governance settings</h2><dl className="metadata-grid"><div><dt>Governance Review</dt><dd>{query.data.guardEnabled ? "Enabled" : "Not enabled"}</dd></div><div><dt>Rules</dt><dd>{query.data.governanceRules || "No governance rules were provided."}</dd></div></dl></article></section><section className="community-message panel"><h2>Linked proposals</h2><p>This Community read does not return proposal relationships. Voxen does not infer them from names, ownership, or activity. Browse the live proposal directory to inspect proposals that disclose a Community link.</p><Link className="button" href="/explore">Explore proposals</Link></section></div>}
  </main>;
}
