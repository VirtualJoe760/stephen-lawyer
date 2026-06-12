import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { AdminProductsList } from "@/components/admin/AdminProductsList";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/admin" className="font-mono text-xs uppercase tracking-widest text-bone/60 hover:text-hazard">
        ‹ Admin
      </Link>
      <h1 className="mt-3 font-display text-4xl uppercase leading-none">Products</h1>
      <p className="mt-3 text-sm text-bone/60">
        Review every product. <span className="text-bone/80">Pause</span> hides it from the shop (keeps it on
        Printful); <span className="text-bone/80">Delete</span> removes it from the store and Printful.
      </p>
      <AdminProductsList />
    </div>
  );
}
