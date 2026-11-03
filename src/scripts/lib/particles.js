// Shared helpers for every dot / pixel particle effect:
//   pixel-background.js (Process, Stats, CTA), faq-accordion.js (+/− icon), testimonial.js (logo dots).
// Colour comes from the nearest `data-ink` attribute, so markup decides the colour, not the JS.

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** Colour for a particle effect: closest [data-ink] on the element or its ancestors, else `fallback`. */
export const inkOf = (el, fallback = "#000") => el.closest("[data-ink]")?.dataset.ink || fallback;

/** 4×4 ordered-dither (Bayer) matrix, values 0–15. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Calls `onChange(isVisible)` as `el` enters/leaves the viewport (with a small pre-load margin). */
export function watchVisibility(el, onChange, rootMargin = "100px") {
  new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin }).observe(el);
}
