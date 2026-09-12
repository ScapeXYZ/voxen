"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { AddressDisplay } from "@/components/governance/AddressDisplay";

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
    {query.isPending && <p role="status">Loading Community from Bradbury…</p>}
    {query.isError && <p role="alert">{query.error.message}</p>}
    {query.data && <><span className="eyebrow">LIVE COMMUNITY · {query.data.id}</span><h1>{query.data.name}</h1><p>{query.data.description || "No description was provided."}</p><section className="panel"><h2>Governance rules</h2><p>{query.data.governanceRules || "No governance rules were provided."}</p><p><strong>Governance Review:</strong> {query.data.guardEnabled ? "Enabled" : "Not enabled"}</p><p><strong>Status:</strong> {query.data.active ? "Active" : "Inactive"}</p><p><strong>Owner:</strong> <AddressDisplay address={query.data.owner} /></p></section></>}
  </main>;
}
