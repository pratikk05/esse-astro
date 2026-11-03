// Site entry. Everything imports its own libraries (no window globals), so the bundler can split
// and tree-shake them. Above-the-fold + scroll-wide code loads now; the rest loads when its section
// gets within ~1.5 screens of the viewport.
import "./smooth-scroll.js";
import "./parallax.js";
import "./logo-marquee.js"; // after smooth-scroll.js: uses window.lenis for scroll direction/velocity
import "./modules/hero-gradient.js";
import "./modules/about-scene.js"; // lightweight; fetches Three.js itself when About is near
import "./modules/stats.js";
import "./modules/services-scroll.js";
import "./modules/work-preview.js";

const lazy = {
  ".bayer-dither-bg": () => import("./modules/pixel-background.js"), // pulls in Three.js
  "[data-stories]": () => import("./modules/testimonial.js"),
  ".faq-wrapper": () => import("./modules/faq-accordion.js"),
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
