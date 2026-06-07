import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID ?? "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? process.env.SANITY_DATASET ?? "production";

export const sanityEnabled = !!projectId;

export const sanity: SanityClient | null = sanityEnabled
  ? createClient({
      projectId,
      dataset,
      apiVersion: "2024-12-01",
      useCdn: true,
      token: process.env.SANITY_API_READ_TOKEN,
    })
  : null;

const builder = sanity ? imageUrlBuilder(sanity) : null;

export function urlFor(src: unknown): string {
  if (!builder) return "";
  return builder.image(src as never).url();
}
