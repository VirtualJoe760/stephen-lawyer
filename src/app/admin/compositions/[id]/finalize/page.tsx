import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { compositions } from "@/db/schema";
import { getTemplate } from "@/lib/printful/templates";
import { getCatalogVariant } from "@/lib/printful/client";
import { FinalizeForm, type FinalizeVariant } from "@/components/admin/FinalizeForm";

export const dynamic = "force-dynamic";

export default async function FinalizePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;

  const [comp] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!comp) notFound();

  const tpl = getTemplate(comp.templateKey);

  // Fetch variant options from Printful (best-effort: needs PRINTFUL_API_KEY +
  // configured variantIds). On failure we surface guidance instead of blocking.
  let variants: FinalizeVariant[] = [];
  let variantsError: string | null = null;
  if (tpl && tpl.variantIds.length) {
    try {
      const fetched = await Promise.all(tpl.variantIds.map((vid) => getCatalogVariant(vid)));
      variants = fetched.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        color: v.color,
        priceCents: Math.round(Number(v.price) * 100),
      }));
    } catch (e) {
      variantsError = `Couldn't load Printful variants: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    variantsError = "No Printful variant IDs configured for this template yet (see templates.ts).";
  }

  return (
    <FinalizeForm
      compositionId={comp.id}
      previewUrl={comp.previewUrl}
      templateName={tpl?.name ?? comp.templateKey}
      placements={tpl?.placements ?? ["front"]}
      defaultPlacement={comp.placement}
      variants={variants}
      variantsError={variantsError}
    />
  );
}
