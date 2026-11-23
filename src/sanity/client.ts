/**
 * Sanity (content for Works + Journal). Read-only client for published content, used at build time
 * (and per request in `astro dev`). The Studio lives separately in /studio (standalone, not embedded).
 * Project ID + dataset are public values (PUBLIC_* in .env); no tokens are used on the site.
 * If Sanity is not configured, unreachable or empty, callers fall back to the local content in
 * src/data/*, so the site always builds.
 */
import { createClient, type QueryParams } from "@sanity/client";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ?? "production";

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: "2026-11-23", // keep hard-coded
      useCdn: false, // static builds: always read the latest published content
      perspective: "published",
    })
  : null;

/** Fetch published content; returns null (→ use local content) when Sanity is off or fails. */
export async function sanityFetch<T>(query: string, params: QueryParams = {}): Promise<T | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (error) {
    console.warn(`[sanity] ${(error as Error).message} — using local content`);
    return null;
  }
}
