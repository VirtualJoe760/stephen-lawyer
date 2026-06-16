import { NextResponse } from "next/server";
import { z } from "zod";

// Newsletter signup. The own database is gone (this is now a Nano Crew template storefront), so the
// email is accepted + logged; persistence moves to the platform when a newsletter endpoint exists.
const schema = z.object({ email: z.string().email(), source: z.string().optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad email" }, { status: 400 });
  console.log("[newsletter] signup", parsed.data.email, parsed.data.source ?? "home");
  return NextResponse.json({ ok: true });
}
