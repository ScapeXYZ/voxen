import { NextRequest, NextResponse } from "next/server";
import { slugLegacyPoapId } from "@/lib/portal-poaps";

const PORTAL_POAPS_URL = "https://portal-admin.genlayer.foundation/api/v1/poaps/";
const MAX_PAGE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 120;
const UPSTREAM_TIMEOUT_MS = 25_000;

type Poap = {
  artwork_url: string | null;
  title: string;
  slug: string;
  event_start_at: string | null;
  legacy_poap_id: number | string | null;
};

function integerParam(value: string | null, fallback: number, maximum: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

function poapRecord(value: unknown): Poap | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const { artwork_url, title, slug, event_start_at, legacy_poap_id } = record;
  if (
    typeof title !== "string" ||
    typeof slug !== "string" ||
    (artwork_url !== null && typeof artwork_url !== "string") ||
    (event_start_at !== null && typeof event_start_at !== "string") ||
    (legacy_poap_id !== undefined && legacy_poap_id !== null && typeof legacy_poap_id !== "number" && typeof legacy_poap_id !== "string")
  ) return null;
  return { artwork_url, title, slug, event_start_at, legacy_poap_id: legacy_poap_id ?? null };
}

function numericLegacyPoapId(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

async function withLegacyPoapId(poap: Poap): Promise<Poap> {
  const detailUrl = new URL(`${encodeURIComponent(poap.slug)}/`, PORTAL_POAPS_URL);
  try {
    const response = await fetch(detailUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (response.ok && response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      const detail: unknown = await response.json();
      if (detail && typeof detail === "object") {
        const record = detail as Record<string, unknown>;
        if (record.slug === poap.slug) {
          const legacyPoapId = numericLegacyPoapId(record.legacy_poap_id);
          if (legacyPoapId) return { ...poap, legacy_poap_id: legacyPoapId };
        }
      }
    }
  } catch {
    // Retain the strictly-scoped compatibility fallback below if detail lookup
    // is unavailable. The outer handler logs catalog-level proxy failures.
  }
  return { ...poap, legacy_poap_id: slugLegacyPoapId(poap.title, poap.slug) };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const page = integerParam(request.nextUrl.searchParams.get("page"), 1, MAX_PAGE);
  const pageSize = integerParam(request.nextUrl.searchParams.get("page_size"), 50, MAX_PAGE_SIZE);
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().replace(/^#+/, "");
  if (page === null || pageSize === null || search.length > MAX_SEARCH_LENGTH) {
    return NextResponse.json({ message: "Invalid POAP catalog parameters." }, { status: 400 });
  }

  const upstreamUrl = new URL(PORTAL_POAPS_URL);
  upstreamUrl.searchParams.set("page", String(page));
  upstreamUrl.searchParams.set("page_size", String(pageSize));
  if (search) upstreamUrl.searchParams.set("search", search);

  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Portal API responded with HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("Portal API returned a non-JSON response");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as { results?: unknown }).results)) throw new Error("Invalid upstream JSON");
    const records = (body as { results: unknown[] }).results.map(poapRecord);
    if (records.some((record) => record === null)) throw new Error("Invalid upstream POAP record");
    const results = await Promise.all(records.map((record) => withLegacyPoapId(record as Poap)));
    const next = (body as { next?: unknown }).next;
    if (next !== null && next !== undefined && typeof next !== "string") throw new Error("Invalid upstream pagination");
    return NextResponse.json(
      { results, page, page_size: pageSize, has_next: Boolean(next) && page < MAX_PAGE },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Portal POAP proxy failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: "The public Portal POAP catalog is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
