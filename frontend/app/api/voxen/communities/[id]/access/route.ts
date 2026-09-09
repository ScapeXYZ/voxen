import { NextResponse } from "next/server";
// No deployed membership registry is integrated. Never infer access from sample
// owners, local storage, voting credentials, or a caller-supplied wallet address.
export async function GET() {
  return NextResponse.json({ status: "unavailable" }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}
