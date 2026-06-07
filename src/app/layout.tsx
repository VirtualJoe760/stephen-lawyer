import type { Metadata, Viewport } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NewsTicker } from "@/components/layout/news-ticker";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";
import { SITE_URL } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo";

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
  applicationName: "STEPHEN LAWYER",
  keywords: [
    "Stephen Lawyer",
    "skateboarding apparel",
    "skate clothing",
    "streetwear",
    "tees",
    "hoodies",
    "hats",
    "made to order",
  ],
  authors: [{ name: "STEPHEN LAWYER" }],
  creator: "STEPHEN LAWYER",
  publisher: "STEPHEN LAWYER",
  category: "shopping",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    title: "STEPHEN LAWYER",
    description: "Direct-to-consumer apparel from pro skateboarder Stephen Lawyer.",
    url: SITE_URL,
    siteName: "STEPHEN LAWYER",
    locale: "en_US",
  },
  // twitter title/description set; handle (site/creator) intentionally omitted
  // until the real @handle is verified (see CONTENT-INVENTORY.md).
  twitter: {
    card: "summary_large_image",
    title: "STEPHEN LAWYER",
    description: "Direct-to-consumer apparel from pro skateboarder Stephen Lawyer.",
  },
  alternates: { canonical: SITE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <StorefrontChrome
          ticker={<NewsTicker />}
          header={<Header />}
          footer={<Footer />}
          drawer={<CartDrawer />}
        >
          {children}
        </StorefrontChrome>
      </body>
    </html>
  );
}
