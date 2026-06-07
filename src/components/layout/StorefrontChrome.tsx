"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Hides the storefront chrome (ticker/header/footer/cart) on /admin/* so the
// design generator can run full-screen. Storefront routes render identically to
// before. Chrome elements are passed in as props (server components rendered by
// the root layout) so this stays a thin client gate.
export function StorefrontChrome({
  ticker,
  header,
  footer,
  drawer,
  children,
}: {
  ticker: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  drawer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      {ticker}
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      {drawer}
    </>
  );
}
