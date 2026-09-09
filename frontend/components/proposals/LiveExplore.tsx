"use client";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Proposal } from "@/types/voxen";
import { ProposalCard } from "./ProposalCard";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";
export function LiveExplore() {
  const [filter, setFilter] = useState("All");
  const now = useVotingClock();
  const query = useInfiniteQuery({
    queryKey: ["voxen-discovery"], initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const response = await fetch(`/api/voxen/proposals?offset=${pageParam}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Live discovery unavailable");
      return body as { proposals: Proposal[]; nextOffset: number | null; total: number };
    },
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    retry: false, refetchInterval: 15000,
  });
  const proposals = [...new Map((query.data?.pages.flatMap((page) => page.proposals) ?? []).map((p) => [p.id, p])).values()];
  const visible = proposals.filter((p) => {
    const state = votingState(p, now);
    return filter === "All" || (filter === "Live" && state === "LIVE") || (filter === "Upcoming" && state === "UPCOMING") || (filter === "Ended" && ["ENDED", "FINALIZED"].includes(state));
  });
  return <>
    <p className="small">Newest first · Filters apply to loaded proposals.</p>
    <div className="row" role="group" aria-label="Proposal filters">{["All", "Live", "Upcoming", "Ended"].map((label) => <button key={label} className="button" aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
    {query.isPending && <p role="status">Discovering live proposals…</p>}
    {query.isError ? <p role="alert">{query.error.message}</p> : <div className="proposal-grid">{visible.map((p) => <ProposalCard key={p.id} proposal={p} />)}</div>}
    {query.isSuccess && !visible.length && <p>No {filter.toLowerCase()} proposals in the loaded pages.</p>}
    {query.hasNextPage && <button className="button" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>Load more proposals</button>}
    <button className="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh proposals</button>
  </>;
}
