/**
 * Journal posts — one source for the home Journal section (components/sections/Blog.astro), the
 * listing page (/blog) and each post page (/blog/<slug>). Posts come from Sanity (Studio →
 * "Journal post"); the three posts below are the local fallback when Sanity is off, unreachable or
 * has no posts. Use getPosts() — it returns both in one shape (body = Portable Text).
 *
 * UNDO the blog pages: set JOURNAL_PAGES to false (cards stop linking, the menu/footer link and the
 * "All notes" link disappear), then delete src/pages/blog/. The home Journal section keeps working.
 *
 * Copy is placeholder-quality studio writing with no invented client results — edit freely.
 */
import { sanityFetch } from "../sanity/client";
import { urlFor } from "../sanity/image";
import { POSTS_QUERY } from "../sanity/queries";

export const JOURNAL_PAGES = true;

export type Theme = "blue" | "dark" | "light"; // thumbnail field → label colour

export interface Section {
  heading: string;
  paragraphs: string[];
  quote?: string;
  list?: string[];
}

export interface LocalPost {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  read: string;
  date: string; // display, e.g. "04 Nov 2026"
  iso: string; // machine date for <time>
  image: string; // label-free art (labels are drawn as text over it, so they never scale)
  alt: string;
  theme: Theme;
  sections: Section[];
}

const localPosts: LocalPost[] = [
  {
    slug: "design-systems-first",
    category: "Design systems",
    title: "Why every site we build starts with a design system",
    excerpt: "Tokens, spacing and type scales decided once — so every new page stays consistent as your site grows.",
    read: "6 min read",
    date: "04 Nov 2026",
    iso: "2026-11-04",
    image: "/images/blog/design-systems-art.png",
    alt: "Pixel grid of interface components on electric blue",
    theme: "blue",
    sections: [
      {
        heading: "Decide once, reuse everywhere",
        paragraphs: [
          "Before we draw a single page, we agree on the small things: the type scale, the spacing steps, the colours and how corners, borders and shadows behave. Each one becomes a named token.",
          "It sounds slow. It is the opposite. Every page after that is assembled from decisions that are already made, so design time goes into the ideas, not into re-choosing a font size.",
        ],
      },
      {
        heading: "Names that design and code share",
        paragraphs: [
          "A token is only useful if the same name means the same thing in Figma and in the codebase. When a designer writes heading-48 and a developer writes heading-48, they are pointing at one rule.",
          "That shared vocabulary is what keeps handoff calm. Nobody measures pixels off a screenshot; they read a name.",
        ],
        quote: "A design system is a set of promises your site keeps on every page.",
      },
      {
        heading: "Built to grow",
        paragraphs: [
          "Sites change after launch. New sections, new campaigns, a new product line. With a system underneath, a new page inherits the right look by default instead of drifting a little further each time.",
        ],
        list: ["One type scale, used by name", "Spacing on a fixed rhythm", "Colours with clear roles", "Components that document themselves"],
      },
      {
        heading: "Where to start",
        paragraphs: [
          "You do not need a hundred components on day one. Start with type, spacing and colour, then grow the system as real pages ask for new pieces. The best systems are written by the work, not ahead of it.",
        ],
      },
    ],
  },
  {
    slug: "performance-is-design",
    category: "Performance",
    title: "Performance is a design decision",
    excerpt: "How we keep motion, 3D and rich visuals fast — and why a good PageSpeed score starts in Figma, not after launch.",
    read: "5 min read",
    date: "21 Oct 2026",
    iso: "2026-10-21",
    image: "/images/blog/performance-art.png",
    alt: "Pixel lightning bolt over a teal dither field",
    theme: "dark",
    sections: [
      {
        heading: "Speed is part of the look",
        paragraphs: [
          "A page that arrives late never makes its first impression. Visitors feel speed before they notice a typeface, so we treat load time as part of the design, not a fix for later.",
        ],
      },
      {
        heading: "Budget the heavy things",
        paragraphs: [
          "Every page gets a weight budget in the design phase. Video, 3D and large images are welcome, but each one has to earn its place and its kilobytes.",
          "When something is heavy, we ask a design question first: does it need to load right away, or can it wait until someone scrolls near it?",
        ],
        quote: "The fastest asset is the one you decided not to ship.",
      },
      {
        heading: "Motion that stays smooth",
        paragraphs: [
          "Smooth motion comes from animating the cheap properties — position, scale, opacity — and pausing anything that is off screen. Our 3D scenes stop rendering when you scroll past them.",
        ],
        list: ["Lazy-load what sits below the fold", "Pause animation off screen", "Serve modern image formats", "Respect reduced-motion settings"],
      },
      {
        heading: "Measure on real devices",
        paragraphs: [
          "Lab scores are a guide, not the goal. We test on mid-range phones and slow connections, because that is where many of your visitors actually are.",
        ],
      },
    ],
  },
  {
    slug: "3d-without-the-weight",
    category: "3D & Motion",
    title: "Adding depth without the weight: 3D on the web",
    excerpt: "When interactive 3D earns its place on a page, and how we ship it lean enough for every device.",
    read: "7 min read",
    date: "08 Oct 2026",
    iso: "2026-10-08",
    image: "/images/blog/3d-on-the-web-art.png",
    alt: "Isometric pixel cube in electric blue",
    theme: "light",
    sections: [
      {
        heading: "When 3D earns its place",
        paragraphs: [
          "3D is a great storyteller when it explains something a flat image cannot: how a product is built, how parts fit together, how a space feels. If it is only decoration, a still image usually does the job better.",
        ],
      },
      {
        heading: "Small models, big presence",
        paragraphs: [
          "Most of the 3D on our sites is built from simple shapes and good lighting rather than heavy scanned models. Clean geometry and a studio light setup go a long way, and they load in a blink.",
        ],
        quote: "Good lighting does more for a 3D scene than a million extra polygons.",
      },
      {
        heading: "Load it only when it matters",
        paragraphs: [
          "The 3D engine is fetched only when its section comes near the screen, and every scene has a still image ready in case a device cannot run it. Nobody waits for a model they never scroll to.",
        ],
        list: ["Load the engine on approach", "Keep a still fallback for every scene", "Pause rendering off screen", "Cap pixel density on large screens"],
      },
      {
        heading: "Designing for touch",
        paragraphs: [
          "On phones, interaction is a thumb, not a cursor. We keep 3D gestures simple and never let a scene steal the page scroll, so the site still feels like a site.",
        ],
      },
    ],
  },
];


// ---- one shape for both sources ----
export interface PTSpan { _type: "span"; _key: string; text: string; marks: string[] }
export interface PTBlock { _type: string; _key: string; style?: string; listItem?: string; level?: number; markDefs?: unknown[]; children?: PTSpan[]; [k: string]: unknown }
export interface Post {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  read: string;
  date: string;
  iso: string;
  image: string;
  alt: string;
  theme: Theme;
  body: PTBlock[];
}

let key = 0;
const block = (text: string, style = "normal", listItem?: string): PTBlock => ({
  _type: "block",
  _key: `l${key++}`,
  style,
  ...(listItem ? { listItem, level: 1 } : {}),
  markDefs: [],
  children: [{ _type: "span", _key: `s${key++}`, text, marks: [] }],
});
const toBody = (sections: Section[]): PTBlock[] =>
  sections.flatMap((s) => [
    block(s.heading, "h2"),
    ...s.paragraphs.map((p) => block(p)),
    ...(s.quote ? [block(s.quote, "blockquote")] : []),
    ...(s.list ?? []).map((item) => block(item, "normal", "bullet")),
  ]);

const fromLocal = (p: LocalPost): Post => ({ ...p, body: toBody(p.sections) });

const displayDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

interface PostDoc {
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  publishedAt?: string;
  readTime?: number;
  theme?: Theme;
  coverImage?: { asset?: { _ref: string }; alt?: string };
  body?: PTBlock[];
}

/** Journal posts, newest first: Sanity when it has posts, otherwise the local three. */
export async function getPosts(): Promise<Post[]> {
  const docs = await sanityFetch<PostDoc[]>(POSTS_QUERY);
  const usable = (docs ?? []).filter((d) => d.title && d.slug && d.coverImage?.asset);
  if (!usable.length) return localPosts.map(fromLocal);
  return usable.map((d) => {
    const iso = (d.publishedAt ?? new Date().toISOString()).slice(0, 10);
    return {
      slug: d.slug,
      category: d.category ?? "Journal",
      title: d.title,
      excerpt: d.excerpt ?? "",
      read: `${d.readTime ?? 5} min read`,
      date: displayDate(iso),
      iso,
      image: urlFor(d.coverImage!).width(1200).height(750).fit("crop").url(),
      alt: d.coverImage!.alt ?? "",
      theme: d.theme ?? "blue",
      body: d.body ?? [],
    };
  });
}

/** Split a body into its intro (before the first heading) and h2 sections, for the contents rail. */
export function splitSections(body: PTBlock[]) {
  const intro: PTBlock[] = [];
  const sections: { heading: string; blocks: PTBlock[] }[] = [];
  for (const b of body) {
    if (b._type === "block" && b.style === "h2") {
      sections.push({ heading: (b.children ?? []).map((c) => c.text).join(""), blocks: [] });
    } else (sections.at(-1)?.blocks ?? intro).push(b);
  }
  return { intro, sections };
}

export const postUrl = (p: { slug: string }) => `/blog/${p.slug}`;
export const number = (i: number) => String(i + 1).padStart(2, "0");
