import { NextRequest, NextResponse } from "next/server";
import { readVoteTransaction } from "@/lib/voxen/transactions";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  const kind = request.nextUrl.searchParams.get("kind");
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(hash) ||
    !["evm", "genlayer"].includes(kind || "")
  )
    return respond({ message: "Invalid transaction reference." }, 400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return respond(
      await Promise.race([
        readVoteTransaction(hash as `0x${string}`, kind as "evm" | "genlayer"),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Transaction status read timed out")),
            20_000,
          );
        }),
      ]),
    );
  } catch (error) {
    return respond(
      {
        message:
          "Transaction status is temporarily unavailable. Your vote may still be processing; do not resubmit.",
        technical: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}
