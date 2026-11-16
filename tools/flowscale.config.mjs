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
  // Figma "Typography / Esse" (170:44): Geist Pixel display/primary headings, 42dot Sans secondary/sub, JetBrains Mono numeric.
  heading: {
    family: "--font-primary",
    sizes: [
      { size: 64, min: 44, weight: 400, leading: "heading", tracking: "lg", source: "Figma Display 01 (64 / mobile 44, 110%, -4%)" },
      { size: 48, min: 40, weight: 400, leading: "heading", tracking: "lg", source: "Figma Heading 01/Primary (48 / 40, 110%, -4%)" },
      { size: 40, min: 30, weight: 400, leading: "title", tracking: "lg", source: "Figma Heading 02/Primary (40 / 30, 120%, -4%)" },
      { size: 32, min: 28, weight: 400, leading: "pixel", tracking: "sm", source: "Figma Heading 03/Primary (32 / 28, 115%, -2%)" },
    ],
  },
  "heading-secondary": {
    family: "--font-secondary",
    sizes: [{ size: 32, min: 24, weight: 500, leading: "heading", tracking: "lg", source: "Figma Heading 01/Secondary (42dot Medium 32 / 24, 110%, -4%)" }],
  },
  subheading: {
    family: "--font-secondary",
    sizes: [{ size: 16, min: 14, weight: 700, leading: "body", tracking: "sm", source: "Figma Sub Heading 01 (42dot Bold 16 / 14, 140%, -2%)" }],
  },
  numeric: {
    family: "--font-tertiary",
    sizes: [{ size: 76, min: 56, weight: 700, leading: "numeric", tracking: "lg", source: "Figma Numeric 01 (Mono Bold 76 / 56, 90%, -4%)" }],
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
      { size: 13, min: 13, leading: "display", tracking: "mono", source: "Figma Label 01 (Process step numbers, fixed)" },
      { size: 12, min: 12, leading: "display", tracking: "mono", source: "Webflow para-12 (fixed)" },
      { size: 11, min: 11, leading: "display", tracking: "mono", source: "Figma Label 03 (bold CTA labels)" },
      { size: 10, min: 10, leading: "display", tracking: "mono", source: "Figma Label 04 (compact metadata)" },
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
