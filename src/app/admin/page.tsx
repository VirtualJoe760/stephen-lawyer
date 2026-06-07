import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CARDS = [
  { href: "/admin/designer", title: "Design Generator", desc: "Prompt designs, composite onto blanks, publish to the shop." },
  { href: "/admin/catalogues", title: "Catalogues", desc: "Create and manage seasonal collections." },
  { href: "/", title: "View store ↗", desc: "Open the public storefront." },
];

export default async function AdminDashboard() {
  await requireAdminPage();
  const session = await auth();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-hazard">Admin</p>
      <h1 className="mt-2 font-display text-5xl uppercase leading-none">Dashboard</h1>
      {session?.user?.email ? (
        <p className="mt-2 text-sm text-bone/50">Signed in as {session.user.email}</p>
      ) : null}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-md border border-bone/15 bg-ink-soft p-5 transition-colors hover:border-hazard"
          >
            <h2 className="font-mono text-sm uppercase tracking-wide text-bone">{c.title}</h2>
            <p className="mt-1 text-xs text-bone/50">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
