import { NextRequest, NextResponse } from "next/server";
import { loadVoxenProposal } from "@/lib/voxen/reads";
import { isMissingProposal } from "@/lib/voxen/client";
export const dynamic = "force-dynamic";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (!/^proposal-[1-9]\d*$/.test(id))
    return respond(
      { state: "unavailable", message: "Invalid proposal address." },
      400,
    );
  try {
    return respond(
      await loadVoxenProposal(id),
    );
  } catch (error) {
    const missing = isMissingProposal(error);
    return respond(
      {
        state: missing ? "unavailable" : "error",
        message: missing
          ? "This proposal is unavailable on the configured contract."
          : "The live contract read failed. Try again.",
      },
      missing ? 404 : 502,
    );
  }
}
