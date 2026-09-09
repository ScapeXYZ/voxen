import { voxenData } from "@/lib/voxen/data";
import { ExploreNetwork } from "@/components/governance/ExploreNetwork";
export default async function Explore() {
  const [spaces, proposals] = await Promise.all([
    voxenData.listSpaces(),
    voxenData.listProposals(),
  ]);
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">THE GOVERNANCE NETWORK</span>
      <div className="page-heading">
        <div>
          <h1>Explore proposals</h1>
          <p>
            Find active community decisions, check voting requirements, and
            explore finalized outcomes.
          </p>
        </div>
        <span className="badge">
          {spaces.length} Spaces ·{" "}
          {proposals.filter((p) => p.status === "OPEN").length} open proposals
        </span>
      </div>
      <div className="demo-notice">
        Sample network · Illustrative Spaces, proposals, and participation.{" "}
        <a href="/live-proof">View the recorded Bradbury proof ↗</a>
      </div>
      <ExploreNetwork spaces={spaces} proposals={proposals} />
    </main>
  );
}
