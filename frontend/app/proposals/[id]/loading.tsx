export default function LoadingProposal() {
  return (
    <main id="main" className="shell proposal-page proposal-loading" aria-busy="true">
      <p className="sr-only" role="status">Loading proposal…</p>
      <span className="skeleton skeleton-back" />
      <span className="skeleton skeleton-status" />
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-copy" />
      <div className="skeleton-cockpit"><span className="skeleton" /><span className="skeleton" /></div>
    </main>
  );
}
