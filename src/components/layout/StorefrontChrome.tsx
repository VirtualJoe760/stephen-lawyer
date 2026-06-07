"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileTabBar } from "./MobileTabBar";

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
  // Admin keeps its own full-screen chrome, but the app-style bottom bar is
  // site-wide (including the design tool).
  if (pathname?.startsWith("/admin")) {
    return (
      <>
        {children}
        <MobileTabBar />
      </>
    );
  }
  return (
    <>
      {ticker}
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      {/* spacer so the fixed mobile tab bar never covers the footer */}
      <div className="h-14 lg:hidden" aria-hidden />
      {drawer}
      <MobileTabBar />
    </>
  );
}
