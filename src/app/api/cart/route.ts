import { NextResponse } from "next/server";

// Cart state lives client-side in Zustand + localStorage. This endpoint exists for
// future server-side reconciliation (logged-in users syncing across devices). For
// v1 it accepts a payload and echoes it back so the contract is established.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return NextResponse.json({ ok: true, echo: body });
}

export async function GET() {
  return NextResponse.json({ items: [] });
}
