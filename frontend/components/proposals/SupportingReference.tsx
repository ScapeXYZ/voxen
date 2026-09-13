/** Hostname-only preview: no external fetching or source endorsement. */
export function SupportingReference({ url, preview = false }: { url: string; preview?: boolean }) {
  if (!url.trim()) return null;
  let reference: URL;
  try {
    reference = new URL(url.trim());
    if (!["http:", "https:"].includes(reference.protocol)) return null;
  } catch {
    return null;
  }
  return (
    <div className="supporting-reference">
      <h4>Supporting reference</h4>
      <a className="text-link wrap" href={reference.href} target="_blank" rel="noopener noreferrer">{reference.hostname} ↗</a>
      <p className="small muted">{preview ? "Reference added" : "Provided by the proposal creator for additional context."}</p>
    </div>
  );
}
