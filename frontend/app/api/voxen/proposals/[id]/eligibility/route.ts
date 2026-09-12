import { NextRequest, NextResponse } from "next/server";
import { checkEligibility } from "@/lib/voxen/reads";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wallet = request.nextUrl.searchParams.get("wallet") || "";
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (!/^proposal-[1-9]\d*$/.test(id) || !/^0x[0-9a-fA-F]{40}$/.test(wallet))
    return respond({ message: "Invalid proposal or wallet." }, 400);
  try {
    return respond(
      await checkEligibility(id, wallet),
    );
  } catch (error) {
    return respond(
      {
        message: "We couldn't verify your voting eligibility. Try again.",
        technical: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}
