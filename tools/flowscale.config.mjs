/*
  FlowScale config — single source of truth for typography + spacing classes.
  Run `pnpm flowscale` after editing to regenerate:
    src/styles/typography.css, src/styles/spacing.css, src/styles/flowscale.manifest.json

  Numbers in class names are the original Figma/Webflow px values (16px reference root).
  `min` = mobile size at 360px viewport; `max` = desktop size at 1440px viewport.
*/

export const viewport = { min: 360, max: 1440 };

/*
  Typography
  - Max sizes, weights, line heights and tracking are taken 1:1 from the Webflow build.
  - Mobile mins come from Webflow's 767px overrides where they exist (heading-76 → 40, heading-56 → 24).
    Webflow's 767px overrides for heading-36 (14px) and heading-32 (12px) sit below the 16px heading floor,
    so they are floored to 16px for readability.
  - Everything else uses the FlowScale fallback: headings 62.5% (16px floor), paragraphs 87.5% (14px floor),
    small text fixed.
*/
export const typography = {
  heading: {
    family: "--font-primary",
    sizes: [
      { size: 76, min: 40, weight: 400, leading: "display", tracking: "display", source: "Webflow heading-style-76 / -90 (767px: 40px)" },
      { size: 56, min: 24, weight: 500, leading: "display", tracking: "xl", source: "Webflow heading-style-56 (767px: 24px)" },
      { size: 36, min: 16, weight: 500, leading: "heading", tracking: "lg", source: "Webflow heading-style-36 (767px: 14px → 16px floor)" },
      { size: 32, min: 16, weight: 500, leading: "heading", tracking: "lg", source: "Webflow heading-style-32 (767px: 12px → 16px floor)" },
      { size: 24, min: 16, weight: 500, leading: "title", tracking: "xl", source: "Webflow heading-style-24 (fallback 62.5% → 16px floor)" },
      { size: 16, min: 16, weight: 500, leading: "body", tracking: "sm", source: "Webflow heading-style-16 (fixed)" },
      { size: 14, min: 14, weight: 500, leading: "body", tracking: "sm", source: "Webflow heading-style-14 (fixed)" },
    ],
  },
  para: {
    family: "--font-secondary",
    sizes: [
      { size: 18, min: 15.75, weight: 500, leading: "body", tracking: "md", source: "Webflow heading-style-18 on <p> (fallback 87.5%)" },
      { size: 16, min: 14, weight: 500, leading: "body", tracking: "sm", source: "Webflow heading-style-16 on <p> (fallback 87.5%)" },
      { size: 14, min: 14, weight: 500, leading: "body", tracking: "sm", source: "Webflow heading-style-14 on <p> (14px floor)" },
    ],
  },
  text: {
    family: "--font-tertiary",
    sizes: [
      // Weight intentionally not set: inherits like the original (body 500 → renders JetBrains Mono 400).
      { size: 14, min: 14, leading: "display", tracking: "mono", source: "Webflow para-14 (fixed)" },
      { size: 12, min: 12, leading: "display", tracking: "mono", source: "Webflow para-12 (fixed)" },
    ],
  },
};

/*
  Spacing fluid policy (no mobile spacing exists in the Webflow build):
    <= 16px → fixed;  17–64px → min 75%;  > 64px → min 50%
  Override per value with { px, min } when a mobile size is known/needed.
*/
export function spacingMin(px) {
  if (px <= 16) return px;
  if (px <= 64) return round(px * 0.75);
  return round(px * 0.5);
}

const standard = [4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120, 160];

export const spacing = {
  // vertical spacers
  spacer: [...standard, 140],
  // flex/grid gaps (gap-figma-* so they never collide with Tailwind gap-*)
  // 28 / 36: menu values that Figma specifies identically at desktop (28) and mobile (36) → fixed.
  gap: [2, 8, 9, 10, 12, 14, 16, 24, { px: 28, min: 28 }, 32, { px: 36, min: 36 }, 40, 48, 52, 60, 64, 65, 95, 128],
  padding: {
    all: [7, 16, 20, 24, 32, 64],
    x: [8, 16, 24, 30, 32, 128],
    y: [14, 16, 24, 32, 90, 96, 100, 111],
    // 24: Figma mobile navbar top padding (already a mobile value) → fixed.
    top: [12, 21, { px: 24, min: 24 }, 28, 32, 52, 80, 128],
    // 160 → min 128: Stats needs room for its three stacked stripes (~87px) on mobile.
    bottom: [12, 24, 32, 40, 122, { px: 160, min: 128 }],
    left: [24, 40],
  },
  margin: {
    all: [16, 24, 32],
    y: [38],
    top: [24, 32, 64, 80, 111, 113, 120],
    bottom: [24, 32],
    right: [115],
  },
};

function round(n) {
  return Math.round(n * 100) / 100;
}
