import Link from "next/link";
import { voxenData } from "@/lib/voxen/data";
import { SpaceNode } from "@/components/spaces/SpaceNode";
import { AddressDisplay } from "@/components/governance/AddressDisplay";
export default async function Communities() {
  const [spaces, proposals] = await Promise.all([
    voxenData.listSpaces(),
    voxenData.listProposals(),
  ]);
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">COMMUNITIES WITH A SHARED PURPOSE</span>
      <div className="page-heading">
        <div>
          <h1>Communities</h1>
          <p>
            A Community is a community governance area containing its rules, admins,
            proposals and decisions.
          </p>
        </div>
        <Link className="button primary" href="/create-community">
          Create a Community ↗
        </Link>
      </div>
      <div className="demo-notice">
        Sample directory · All Communities shown here are illustrative.
      </div>
      {!spaces.length && (
        <p className="empty">
          No Communities yet. Create the first governance Community using the button
          above.
        </p>
      )}
      <div className="space-directory">
        {spaces.map((s) => (
          <article className="panel" key={s.id}>
            <SpaceNode
              space={s}
              count={
                proposals.filter(
                  (p) => p.spaceId === s.id && p.status === "OPEN",
                ).length
              }
            />
            <p>{s.description}</p>
            <h4>Constitution</h4>
            <p>{s.constitution}</p>
            <div className="card-tags">
              <span className="badge">
                Guard {s.guardEnabled ? "enabled" : "off"}
              </span>
              <span className="badge">
                {s.id === "fieldnotes" ? "NFT credential" : "GEN holding"}
              </span>
            </div>
            <div className="card-foot">
              Owner <AddressDisplay address={s.owner} compact />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
