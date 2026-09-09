"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import { parseCommunityAccess, type CommunityAccessState } from "@/lib/voxen/community-access";

export function CommunityWorkspace({ communityId, active }: { communityId: string; active: boolean }) {
  const wallet = useWallet();
  const address = wallet.isConnected ? wallet.address : undefined;
  const key = `${communityId}:${address?.toLowerCase() || ""}`;
  const [result, setResult] = useState<{ key: string; state: CommunityAccessState }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    setResult({ key, state: { status: "checking" } });
    fetch(`/api/voxen/communities/${encodeURIComponent(communityId)}/access?wallet=${encodeURIComponent(address)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Access unavailable");
        return parseCommunityAccess(await response.json(), address, communityId);
      })
      .then(state => { if (!controller.signal.aborted) setResult({ key, state }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, state: { status: "unavailable" } }); });
    return () => controller.abort();
  }, [address, communityId, key, retry]);
  const state: CommunityAccessState = !address ? { status: "disconnected" }
    : result?.key === key ? result.state : { status: "checking" };
  const verified = active && state.status === "verified";
  const manager = verified && ["OWNER", "ADMIN"].includes(state.access.role);
  return <section className="panel" aria-label="Community workspace access">
    <h2>Community workspace</h2>
    <p role="status">{state.status === "disconnected" ? "Connect your wallet to access this Community."
      : state.status === "checking" ? "Checking Community access..."
      : state.status === "denied" ? "You can view this Community, but this wallet does not have access to its full workspace."
      : state.status === "verified" ? "Community access verified."
      : "Community access verification is unavailable. Full workspace features remain locked."}</p>
    <p className="small muted">Public proposals remain accessible. Voting requires each proposal’s GEN or NFT / POAP eligibility, independently of Community membership.</p>
    {!active && <p>This Community is inactive. Workspace features remain locked.</p>}
    {state.status === "disconnected" && <WalletButton />}
    {state.status === "unavailable" && <button className="button" onClick={() => setRetry(n => n + 1)}>Check Community access again</button>}
    {verified && <div>
      <p className="demo-notice">Workspace UI prepared · Community contract integration pending. These controls are unavailable.</p>
      <h3>Community dashboard</h3>
      <p>Role: {state.access.role}</p>
      <p>Constitution / rules · Governance Review · Proposal and decision history</p>
      <button className="button" disabled>Create Community proposal · pending</button>
      {manager && <div aria-label="Community management">
        <h3>{state.access.role === "OWNER" ? "Community owner" : "Community admin"} management</h3>
        <button className="button" disabled>Manage wallet whitelist · pending</button>
        <button className="button" disabled>Manage proposals · pending</button>
        <button className="button" disabled>Configure rules and Governance Review · pending</button>
        {state.access.role === "OWNER" && <button className="button" disabled>Manage admins and ownership · pending</button>}
      </div>}
    </div>}
  </section>;
}
