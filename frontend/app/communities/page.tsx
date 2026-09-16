import Link from "next/link";
import { getSpace, getSpaceIds } from "@/lib/voxen/reads";

export const dynamic = "force-dynamic";

export default async function Communities() {
  try {
    const page = await getSpaceIds();
    const results = await Promise.allSettled(page.ids.map((id) => getSpace(id)));
    const communities = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    return <main id="main" className="shell page communities-page"><span className="eyebrow">Community governance</span><h1>Communities</h1><p>Discover Community workspaces returned by the active contract. Governance Review may be enabled by a Community, but it informs a proposal process rather than replacing a vote.</p><div className="community-count" role="status">{page.total} {page.total === 1 ? "Community" : "Communities"} discoverable</div>{page.total === 0 ? <Empty /> : !communities.length ? <ReadFailure /> : <section className="community-grid" aria-label="Discoverable Communities">{communities.map((community) => <article className="community-card panel" key={community.id}><div><span className={`status-pill ${community.active ? "status-live" : "status-ended"}`}>{community.active ? "Active" : "Inactive"}</span><h2>{community.name}</h2><p>{community.description || "No description was provided."}</p></div><dl><div><dt>Community ID</dt><dd><code>{community.id}</code></dd></div><div><dt>Governance Review</dt><dd>{community.guardEnabled ? "Enabled" : "Not enabled"}</dd></div></dl><Link className="button" href={`/communities/${community.id}`}>Open Community</Link></article>)}</section>}</main>;
  } catch {
    return <main id="main" className="shell page communities-page"><span className="eyebrow">Community governance</span><h1>Communities</h1><p>Community discovery reads the active contract; it does not use sample workspaces.</p><section className="community-message panel" role="alert"><h2>Community discovery is unavailable</h2><p>The configured deployment could not be read. This is a network or contract read failure, not evidence that no Communities exist.</p><Link href="/communities" className="button">Retry discovery</Link></section></main>;
  }
}
function Empty() { return <section className="community-message panel"><h2>No Community workspaces are currently discoverable</h2><p>The active contract returned no Community IDs. You can still create a public proposal or browse available proposals.</p><div className="proof-actions"><Link href="/create" className="button primary">Create proposal</Link><Link href="/explore" className="button">Explore</Link></div></section>; }
function ReadFailure() { return <section className="community-message panel" role="alert"><h2>Community records could not be read</h2><p>The contract returned Community IDs, but their records were unavailable. This is not an empty Community list.</p><Link href="/communities" className="button">Retry discovery</Link></section>; }
