import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">Page not found</span>
      <h1>This decision isn’t here.</h1>
      <p>The requested Community or proposal may be unavailable, or the address may be incorrect.</p>
      <Link className="button primary" href="/explore">
        Explore governance ↗
      </Link>
    </main>
  );
}
