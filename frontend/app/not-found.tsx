import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell page">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>This decision isn’t here.</h1>
      <p>The Community or proposal may not be available in the sample network.</p>
      <Link className="button primary" href="/explore">
        Explore governance ↗
      </Link>
    </main>
  );
}
