"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Archive, CheckCircle2, Clock3, LayoutList, Radio, ShieldCheck } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Proposal } from "@/types/voxen";
import { ProposalCard } from "./ProposalCard";
import { votingState } from "@/lib/voxen/lifecycle";
import { useVotingClock } from "@/hooks/useVotingClock";

const statuses = [
  { id: "ALL", label: "All", preview: "All available proposals across every status.", Icon: LayoutList },
  { id: "LIVE", label: "Live", preview: "Currently active and accepting votes.", Icon: Radio },
  { id: "UPCOMING", label: "Upcoming", preview: "Scheduled proposals that have not started yet.", Icon: Clock3 },
  { id: "ENDED", label: "Ended", preview: "Voting has ended and awaits final handling.", Icon: Archive },
  { id: "FINALIZED", label: "Finalized", preview: "Completed proposals with confirmed outcomes.", Icon: CheckCircle2 },
  { id: "REVIEW", label: "Review", preview: "Proposals undergoing Governance Review.", Icon: ShieldCheck },
] as const;
type StatusId = (typeof statuses)[number]["id"];

export function LiveExplore() {
  const [filter, setFilter] = useState<StatusId>("ALL");
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
    retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const proposals = [...new Map((query.data?.pages.flatMap((page) => page.proposals) ?? []).map((p) => [p.id, p])).values()];
  const stateFor = (proposal: Proposal) => votingState(proposal, now) as StatusId;
  const countFor = (status: StatusId) => status === "ALL" ? proposals.length : proposals.filter((proposal) => stateFor(proposal) === status).length;
  const visible = filter === "ALL" ? proposals : proposals.filter((proposal) => stateFor(proposal) === filter);
  const selected = statuses.find((status) => status.id === filter)!;

  useEffect(() => {
    const index = statuses.findIndex((status) => status.id === filter);
    cardRefs.current[index]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "center" });
  }, [filter]);

  function handleKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"] as string[]).includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (index + direction + statuses.length) % statuses.length;
    setFilter(statuses[next].id);
    cardRefs.current[next]?.focus();
  }

  return <section className="status-explorer" aria-label="Proposal status explorer">
    <p className="small status-explorer-note">Newest first · Status counts apply to loaded live proposals.</p>
    <div className="status-stage" role="tablist" aria-label="Proposal status filters">
      {statuses.map((status, index) => {
        const active = filter === status.id;
        const count = countFor(status.id);
        const Icon = status.Icon;
        return <button key={status.id} ref={(node) => { cardRefs.current[index] = node; }} type="button" role="tab" id={`status-tab-${status.id}`} aria-controls="status-results" aria-selected={active} tabIndex={active ? 0 : -1} className={`status-rail-tab status-${status.id.toLowerCase()}${active ? " is-active" : ""}`} onClick={() => setFilter(status.id)} onKeyDown={(event) => handleKeys(event, index)}>
          <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
          <span className="status-rail-label">{status.label}</span>
          <span className="status-rail-count" aria-label={`${count} ${count === 1 ? "proposal" : "proposals"}`}>{count}</span>
        </button>;
      })}
    </div>
    <div className="status-detail" id="status-results" role="tabpanel" aria-labelledby={`status-tab-${filter}`} tabIndex={-1}>
      <div className="status-detail-heading"><div><span className="eyebrow">Selected status</span><h2>{selected.label} proposals</h2></div><p>{selected.preview}</p></div>
      {query.isPending && <div className="proposal-grid proposal-skeletons" role="status" aria-label="Discovering live proposals"><ProposalSkeleton /><ProposalSkeleton /><ProposalSkeleton /><ProposalSkeleton /></div>}
      {query.isError ? <div className="status-error" role="alert"><ShieldCheck aria-hidden="true" size={22} /><div><strong>Discovery is temporarily unavailable.</strong><p>{query.error.message}</p></div><button className="button" onClick={() => void query.refetch()}>Retry discovery</button></div> : !query.isPending && <div className="proposal-grid">{visible.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)}</div>}
      {query.isSuccess && !visible.length && <div className="status-empty"><strong>No {selected.label.toLowerCase()} proposals right now.</strong><p>{filter === "LIVE" ? "Check Upcoming for proposals scheduled to begin later." : "Try another status or refresh the live proposal list."}</p></div>}
      {!query.isError && <div className="status-explorer-actions">
        {query.hasNextPage && <button className="button" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>Load more proposals</button>}
        <button className="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh proposals</button>
      </div>}
    </div>
  </section>;
}

function ProposalSkeleton() {
  return <div className="proposal-card proposal-skeleton" aria-hidden="true"><span /><span /><span /><span /><span /></div>;
}
