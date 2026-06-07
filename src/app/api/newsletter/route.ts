import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { newsletter } from "@/db/schema";

const schema = z.object({ email: z.string().email(), source: z.string().optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad email" }, { status: 400 });

  if (!process.env.DATABASE_URL) {
    console.log("[newsletter] signup (no DB)", parsed.data.email);
    return NextResponse.json({ ok: true });
  }

  try {
    await db.insert(newsletter).values({ email: parsed.data.email, source: parsed.data.source ?? "home" }).onConflictDoNothing();
  } catch (err) {
    console.error("[newsletter] insert failed", err);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
