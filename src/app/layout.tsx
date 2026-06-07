import type { Metadata, Viewport } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NewsTicker } from "@/components/layout/news-ticker";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SITE_URL } from "@/lib/utils";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "STEPHEN LAWYER",
    template: "%s · STEPHEN LAWYER",
  },
  description:
    "Direct-to-consumer apparel from pro skateboarder Stephen Lawyer. Tees, hoodies, hats, accessories. Made on demand. Shipped worldwide.",
  openGraph: {
    type: "website",
    title: "STEPHEN LAWYER",
    description: "Direct-to-consumer apparel from pro skateboarder Stephen Lawyer.",
    url: SITE_URL,
    siteName: "STEPHEN LAWYER",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col bg-bone text-ink">
        <NewsTicker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
