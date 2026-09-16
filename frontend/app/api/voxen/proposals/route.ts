import { NextRequest, NextResponse } from "next/server";
import { discoverProposals } from "@/lib/voxen/reads";
import { isServerBusyError, retryAfterSeconds, safeErrorSnapshot } from "@/lib/voxen/discovery";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) return NextResponse.json({ message: "Invalid limit" }, { status: 400 });
  try {
    return NextResponse.json(await discoverProposals(offset, limit), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Temporary diagnostic for the wrapped SDK/RPC error shape; safeErrorSnapshot redacts secret-looking fields.
    console.error("Voxen proposal discovery failed", safeErrorSnapshot(error));
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (isServerBusyError(error)) headers["Retry-After"] = String(Math.max(1, Math.ceil(retryAfterSeconds(error) ?? 2)));
    return NextResponse.json({ message: "Live discovery is unavailable. The configured deployment must support proposal enumeration; a network read may also have failed. No sample proposals are shown." }, { status: 503, headers });
  }
}
