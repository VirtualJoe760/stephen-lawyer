import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin/auth";

export default async function AccountHome() {
  const session = await auth();
  const admin = await isAdmin();
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <section className="border-2 border-ink p-6">
        <h2 className="wordmark text-2xl mb-4">Profile</h2>
        <dl className="space-y-2 font-mono text-sm">
          <div className="flex gap-2"><dt className="text-ink/60 uppercase text-xs tracking-widest w-24">Name</dt><dd>{session?.user?.name ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="text-ink/60 uppercase text-xs tracking-widest w-24">Email</dt><dd>{session?.user?.email}</dd></div>
        </dl>
      </section>
      <section className="border-2 border-ink p-6">
        <h2 className="wordmark text-2xl mb-4">Quick links</h2>
        <ul className="space-y-2 font-mono text-sm uppercase tracking-widest">
          {admin ? (
            <li>
              <Link
                href="/admin"
                className="inline-block bg-hazard px-3 py-2 text-bone transition-opacity hover:opacity-90"
              >
                Admin · Design Generator →
              </Link>
            </li>
          ) : null}
          <li><Link href="/account/orders" className="hover:text-hazard">Order history →</Link></li>
          <li><Link href="/account/addresses" className="hover:text-hazard">Saved addresses →</Link></li>
          <li><Link href="/shop" className="hover:text-hazard">Keep shopping →</Link></li>
        </ul>
      </section>
    </div>
  );
}
