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
      <Link href="/spaces" className="eyebrow">
        ← ALL SPACES
      </Link>
      <div className="page-heading">
        <div>
          <span className="space-symbol">{s.symbol}</span>
          <h1>{s.name}</h1>
          <p>{s.description}</p>
        </div>
        {s.active && s.permission === "OPEN" && (
          <Link className="button primary" href={`/create?space=${s.id}`}>
            Prepare proposal draft ↗
          </Link>
        )}
      </div>
      <div className="demo-notice">
        Sample Space · No live membership or ownership state is loaded.
      </div>
      <div className="row start">
        <StatusBadge status={s.active ? "ACTIVE" : "INACTIVE"} />
        <span>Owner</span>
        <AddressDisplay address={s.owner} compact />
      </div>
      <nav className="section-links" aria-label="Space sections">
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
                prepare a proposal if your Space allows it.
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
                  ? "Open to any wallet"
                  : "Owner and admins"}
              </dd>
            </dl>
            <p className="small muted">
              Open proposal creation means community members may create
              proposals. Voting is still eligibility-gated. This sample does not
              verify admin authority.
            </p>
          </section>
          <section className="panel">
            <h3>Governance Guard</h3>
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
            <h3>Members & eligibility</h3>
            <p>
              Eligibility is configured per proposal through GEN holding or an
              NFT / POAP credential. Membership counts are not inferred from
              votes.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
