import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

const TABS = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?from=/account");

  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">Account</p>
            <h1 className="wordmark text-4xl md:text-6xl">{session.user.name ?? session.user.email}</h1>
          </div>
          <form action={doSignOut}>
            <button type="submit" className="font-mono text-xs uppercase tracking-widest underline hover:text-hazard">
              Sign out
            </button>
          </form>
        </div>

        <nav className="flex gap-6 border-b-2 border-ink mb-10 font-mono text-xs uppercase tracking-widest overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="py-3 hover:text-hazard whitespace-nowrap">
              {t.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
