import { NextRequest, NextResponse } from "next/server";
import { discoverProposals } from "@/lib/voxen/reads";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
  try {
    return NextResponse.json(await discoverProposals(offset), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Live discovery is unavailable. The configured deployment must support proposal enumeration; a network read may also have failed. No sample proposals are shown." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
