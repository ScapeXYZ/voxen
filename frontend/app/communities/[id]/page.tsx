import { CommunityWorkspace } from "@/components/communities/CommunityWorkspace";
import { notFound } from "next/navigation";
import Link from "next/link";
import { voxenData } from "@/lib/voxen/data";
import { AddressDisplay } from "@/components/governance/AddressDisplay";
import { StatusBadge } from "@/components/governance/Badges";
import { ProposalCard } from "@/components/proposals/ProposalCard";
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await voxenData.getSpace(id);
  if (!s) notFound();
  const ps = (await voxenData.listProposals()).filter((p) => p.spaceId === id);
  return (
    <main id="main" className="shell page">
      <Link href="/communities" className="eyebrow">
        ← ALL COMMUNITIES
      </Link>
      <div className="page-heading">
        <div>
          <span className="space-symbol">{s.symbol}</span>
          <h1>{s.name}</h1>
          <p>{s.description}</p>
        </div>

      </div>
      <div className="demo-notice">
        Sample Community · No live membership or ownership state is loaded.
      </div>
      <CommunityWorkspace communityId={s.id} active={s.active} />
      <div className="row start">
        <StatusBadge status={s.active ? "ACTIVE" : "INACTIVE"} />
        <span>Owner</span>
        <AddressDisplay address={s.owner} compact />
      </div>
      <nav className="section-links" aria-label="Community sections">
        <a href="#overview">Overview</a>
        <a href="#proposals">Proposals</a>
        <a href="#constitution">Constitution</a>
        <a href="#decisions">Decisions</a>
      </nav>
      <div className="detail-columns">
        <div>
          <section className="panel">
            <h2 id="constitution">Constitution</h2>
            <p className="constitution">{s.constitution}</p>
          </section>
          <section className="detail-section">
            <h2 id="proposals">Active proposals</h2>
            {!ps.some((p) => ["OPEN", "REVIEW"].includes(p.status)) && (
              <p>
                No active proposals right now.{" "}
                <Link href="/explore">Explore finalized decisions</Link> or
                prepare a proposal if your Community allows it.
              </p>
            )}
            <div className="proposal-grid">
              {ps
                .filter((p) => ["OPEN", "REVIEW"].includes(p.status))
                .map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
            </div>
          </section>
          <section className="detail-section">
            <h2 id="decisions">Recent finalized decisions</h2>
            {ps.some((p) => p.status === "FINALIZED") ? (
              ps
                .filter((p) => p.status === "FINALIZED")
                .map((p) => <ProposalCard key={p.id} proposal={p} />)
            ) : (
              <p className="muted">
                No finalized decisions yet. Explore the active proposals above.
              </p>
            )}
          </section>
        </div>
        <aside>
          <section className="panel">
            <h3 id="overview">Overview</h3>
            <StatusBadge status={s.active ? "ACTIVE" : "INACTIVE"} />
            <dl>
              <dt>Owner</dt>
              <dd>
                <AddressDisplay address={s.owner} compact />
              </dd>
              <dt>Admins</dt>
              <dd>
                {s.admins.length
                  ? s.admins.map((a) => (
                      <AddressDisplay key={a} address={a} compact />
                    ))
                  : "No additional admins"}
              </dd>
              <dt>Proposal creation</dt>
              <dd>
                {s.permission === "OPEN"
                  ? "Whitelisted members (policy permitting)"
                  : "Owner and admins"}
              </dd>
            </dl>
            <p className="small muted">
              Full workspace access requires an owner/admin whitelist grant. Proposal credential requirements apply separately, including to members. This is public sample information.
            </p>
          </section>
          <section className="panel">
            <h3>Governance Review</h3>
            <dl>
              <dt>Review</dt>
              <dd>{s.guardEnabled ? "Enabled" : "Disabled"}</dd>
              <dt>Non-compliant behavior</dt>
              <dd>
                {s.nonCompliantPolicy === "BLOCK"
                  ? "Non-compliant proposals cannot open until corrected."
                  : "Non-compliant proposals may continue with a visible warning."}
              </dd>
            </dl>
          </section>
          <section className="panel">
            <h3>Community access & voting</h3>
            <p>
              Eligibility is configured per proposal through GEN holding or an
              NFT / POAP credential. A non-member may vote on a public proposal if eligible. A whitelisted member must still satisfy that proposal’s credential rule.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
