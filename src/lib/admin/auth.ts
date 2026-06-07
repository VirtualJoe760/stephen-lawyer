import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Parsed, normalized admin allowlist from ADMIN_EMAILS (comma-separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True if the current session belongs to an allowlisted admin. */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return adminEmails().includes(email);
}

/**
 * Route-handler guard. Returns a 403 Response if not an admin, otherwise null.
 * (Next.js route handlers must RETURN responses — throwing a Response is not
 * caught, so callers do: `const denied = await requireAdminRoute(); if (denied) return denied;`)
 */
export async function requireAdminRoute(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

/** Server-component guard. Redirects non-admins away from /admin/*. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/sign-in?admin=1");
}
