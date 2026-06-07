import type { MetadataRoute } from "next";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: "SL",
    description: BRAND_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F0F",
    theme_color: "#0F0F0F",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
