import { NextRequest, NextResponse } from "next/server";
import { getVote, loadVoxenProposal } from "@/lib/voxen/reads";
import { isMissingProposal } from "@/lib/voxen/client";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wallet = request.nextUrl.searchParams.get("wallet");
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (
    !/^proposal-[1-9]\d*$/.test(id) ||
    (wallet !== null &&
      (!/^0x[0-9a-fA-F]{40}$/.test(wallet) || /^0x0{40}$/i.test(wallet)))
  )
    return respond(
      { state: "unavailable", message: "Invalid proposal or wallet address." },
      400,
    );
  try {
    return respond(
      wallet === null
        ? await loadVoxenProposal(id)
        : { vote: await getVote(id, wallet) },
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
