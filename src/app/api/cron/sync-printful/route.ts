import { NextResponse } from "next/server";
import { syncPrintfulCatalog } from "@/lib/printful/sync";

export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await syncPrintfulCatalog();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron sync-printful] failed", err);
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
