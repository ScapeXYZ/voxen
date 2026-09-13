import { NextResponse } from "next/server";
import { getSpace } from "@/lib/voxen/reads";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^space-[1-9]\d*$/.test(id))
    return NextResponse.json({ message: "Invalid Community ID." }, { status: 400 });
  try {
    return NextResponse.json(await getSpace(id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "This Community could not be read from the live contract." }, { status: 404 });
  }
}
