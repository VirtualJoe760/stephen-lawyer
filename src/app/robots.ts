import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Thin/private/transactional routes with no search value.
        disallow: ["/admin", "/admin/", "/account", "/account/", "/api/", "/cart", "/order", "/order/", "/sign-in"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
