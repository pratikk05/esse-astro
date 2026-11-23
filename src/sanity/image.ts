import { createImageUrlBuilder } from "@sanity/image-url";
import { sanityClient } from "./client";

const builder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

/** Image URL builder for Sanity image fields (auto-format → WebP/AVIF where supported). */
export function urlFor(source: Parameters<NonNullable<typeof builder>["image"]>[0]) {
  if (!builder) throw new Error("Sanity is not configured");
  return builder.image(source).auto("format");
}
