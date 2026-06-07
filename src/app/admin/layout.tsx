import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <div className="min-h-screen bg-ink text-bone">{children}</div>;
}
