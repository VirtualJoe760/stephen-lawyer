import { db } from "@/lib/db";
import { catalogues } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { slugify } from "@/lib/utils";
import { asc } from "drizzle-orm";

export async function GET() {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const rows = await db
    .select()
    .from(catalogues)
    .orderBy(asc(catalogues.sortOrder), asc(catalogues.createdAt));
  return Response.json({ catalogues: rows });
}

export async function POST(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const slug = slugify(name);
  if (!slug) return Response.json({ error: "Invalid name" }, { status: 400 });

  const [row] = await db
    .insert(catalogues)
    .values({ name, slug })
    .onConflictDoNothing({ target: catalogues.slug })
    .returning();

  if (!row) {
    return Response.json({ error: "A catalogue with that name already exists" }, { status: 409 });
  }
  return Response.json({ catalogue: row }, { status: 201 });
}
