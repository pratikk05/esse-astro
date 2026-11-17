// Site entry. Everything imports its own libraries (no window globals), so the bundler can split
// and tree-shake them. Above-the-fold + scroll-wide code loads now; the rest loads when its section
// gets within ~1.5 screens of the viewport.
import "./smooth-scroll.js";
import "./parallax.js";
import "./logo-marquee.js"; // after smooth-scroll.js: uses window.lenis for scroll direction/velocity
import "./modules/hero-gradient.js";
import "./modules/about-scene.js"; // lightweight; fetches Three.js itself when About is near
import "./modules/stats.js";
import "./modules/work-preview.js";
import "./modules/section-overlap.js"; // Hero → logos, FAQ → CTA: pinned sink-back + pixel edge
import "./modules/text-reveal.js"; // [data-split] / [data-fade] text animations on view

const lazy = {
  ".bayer-dither-bg": () => import("./modules/pixel-background.js"), // pulls in Three.js
  "[data-stories]": () => import("./modules/testimonial.js"),
  "[data-cta-scene]": () => import("./modules/cta-dissolve.js"), // About→Stats-style pixel reveal into the CTA
  ".faq-wrapper": () => import("./modules/faq-accordion.js"),
  ".process_container": () => import("./modules/uniflow-process.js"), // canvas circle-to-gear + card sequence
  ".services, .mobile-services": () => import("./modules/uniflow-services/index.js"), // pulls in Three.js + GSAP ScrollTrigger
};

for (const [selector, load] of Object.entries(lazy)) {
  const els = document.querySelectorAll(selector);
  if (!els.length) continue;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    load();
  }, { rootMargin: "150% 0px" });
  els.forEach((el) => io.observe(el));
}
