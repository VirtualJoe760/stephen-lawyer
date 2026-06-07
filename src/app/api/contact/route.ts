import { NextResponse } from "next/server";
import { z } from "zod";
import { resend, RESEND_FROM } from "@/lib/resend";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  topic: z.string().min(1).max(60),
  message: z.string().min(5).max(5000),
});

const CONTACT_INBOX = process.env.CONTACT_INBOX_EMAIL ?? "hello@stephenlawyer.clothing";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid form" }, { status: 400 });

  if (!resend) {
    console.log("[contact] message (no Resend)", parsed.data);
    return NextResponse.json({ ok: true });
  }

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: CONTACT_INBOX,
      replyTo: parsed.data.email,
      subject: `[${parsed.data.topic}] ${parsed.data.name}`,
      text: `${parsed.data.message}\n\n—\nFrom ${parsed.data.name} <${parsed.data.email}>`,
    });
  } catch (err) {
    console.error("[contact] send failed", err);
    return NextResponse.json({ error: "Could not send" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
