/**
 * Selected Works — from Sanity (`project` documents, ordered in the Studio) with the original five
 * projects below as the local fallback (used when Sanity is off, unreachable or has no projects).
 * Covers are studio-lit device mockups; `gallery` feeds the hover preview window.
 */
import { sanityFetch } from "../sanity/client";
import { urlFor } from "../sanity/image";
import { WORKS_QUERY } from "../sanity/queries";

export interface Work {
  name: string;
  details: [string, string][];
  cover: { src: string; srcset?: string; alt?: string };
  gallery: string[];
}

const local = (key: string, name: string, industry: string, domain: string, alt: string): Work => ({
  name,
  details: [
    ["Industry", industry],
    ["Platform", "Webflow"],
    ["Website", domain],
  ],
  cover: {
    src: `/images/works/${key}/cover.webp`,
    srcset: `/images/works/${key}/cover-w640.webp 640w, /images/works/${key}/cover.webp 1220w`,
    alt,
  },
  gallery: [1, 2, 3, 4].map((n) => `/images/works/${key}/${n}.webp`),
});

export const localWorks: Work[] = [
  local("ys", "YS HOMES", "Construction", "ys-homes.webflow.io", "YS Homes website on a MacBook and an iPhone"),
  local("pineapple", "PINEAPPLE RETREAT", "Company Culture", "pineapple-new.webflow.io", "Pineapple Retreat 2024 website on three iPhones"),
  local("izart", "IZART STUDIO", "Branding Studio", "izart.in", "Izart Studio website on a desktop monitor and an iPhone"),
  local("lumikai", "LUMIKAI", "Venture Capital", "lumikai.webflow.io", "Lumikai website on an iPhone"),
  local("nocturn", "NOCTURN STUDIO", "Creative Studio", "nocturn-studio.webflow.io", "Nocturn Studio full page and two iPhones"),
];

type SanityImage = { asset?: { _ref: string }; alt?: string };
interface ProjectDoc {
  name: string;
  industry?: string;
  platform?: string;
  website?: string;
  cover?: SanityImage;
  gallery?: SanityImage[];
}

export async function getWorks(): Promise<Work[]> {
  const docs = await sanityFetch<ProjectDoc[]>(WORKS_QUERY);
  const usable = (docs ?? []).filter((d) => d.name && d.cover?.asset);
  if (!usable.length) return localWorks;
  return usable.map((d) => ({
    name: d.name.toUpperCase(),
    details: [
      ["Industry", d.industry ?? ""],
      ["Platform", d.platform ?? "Webflow"],
      ["Website", (d.website ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")],
    ].filter(([, v]) => v) as [string, string][],
    cover: {
      src: urlFor(d.cover!).width(1220).url(),
      srcset: `${urlFor(d.cover!).width(640).url()} 640w, ${urlFor(d.cover!).width(1220).url()} 1220w`,
      alt: d.cover!.alt ?? `${d.name} website`,
    },
    gallery: (d.gallery ?? []).filter((g) => g.asset).map((g) => urlFor(g).width(900).height(900).fit("crop").url()),
  }));
}
