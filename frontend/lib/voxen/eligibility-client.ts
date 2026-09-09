export async function fetchEligibility(id: string, wallet: string) {
  const response = await fetch(
    `/api/voxen/proposals/${encodeURIComponent(id)}/eligibility?wallet=${encodeURIComponent(wallet)}`,
    { cache: "no-store", signal: AbortSignal.timeout(25_000) },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body.technical || body.message);
  return body as {
    eligible: boolean;
    observedBalance: string;
    checkedAt: string;
  };
}
