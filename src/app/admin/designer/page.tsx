import { requireAdminPage } from "@/lib/admin/auth";
import { CatalogueList } from "@/components/admin/CatalogueList";
import { CatalogueCreate } from "@/components/admin/CatalogueCreate";

export const dynamic = "force-dynamic";

export default async function DesignerPicker() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-hazard">Design Generator</p>
      <h1 className="mt-2 font-display text-4xl uppercase leading-none">Catalogues</h1>
      <p className="mt-3 text-sm text-bone/60">Pick a catalogue to open the canvas, or create a new one.</p>
      <CatalogueList />
      <div className="mt-8">
        <CatalogueCreate />
      </div>
    </div>
  );
}
