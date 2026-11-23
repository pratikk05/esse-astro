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
import "./modules/ripple-grid.js"; // the "Our stack" click-ripple line grid on every grid section
import "./modules/text-reveal.js"; // [data-split] / [data-fade] text animations on view

const lazy = {
  ".bayer-dither-bg": () => import("./modules/pixel-background.js"), // pulls in Three.js
  "[data-stories]": () => import("./modules/testimonial.js"),
  "[data-cta-scene]": () => import("./modules/cta-dissolve.js"), // About→Stats-style pixel reveal into the CTA
  ".faq-wrapper": () => import("./modules/faq-accordion.js"),
  ".process_container": () => import("./modules/uniflow-process.js"), // canvas circle-to-gear + card sequence
  ".services, .mobile-services": () => import("./modules/uniflow-services/index.js"), // pulls in Three.js + GSAP ScrollTrigger
};

// Each section's code loads when it nears the viewport — or earlier, while the browser is idle after
// the page has loaded (one module per idle slot, in page order), so heavy setup such as WebGL
// shader compiles happens before the visitor scrolls there instead of stalling a scroll frame.
const pending = [];
for (const [selector, load] of Object.entries(lazy)) {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length) continue;
  let done = false;
  const run = () => { if (done) return; done = true; io.disconnect(); load(); };
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) run(); }, { rootMargin: "150% 0px" });
  els.forEach((el) => io.observe(el));
  pending.push({ run, top: els[0].getBoundingClientRect().top + scrollY });
}
pending.sort((a, b) => a.top - b.top);
const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
const warm = () => {
  const next = pending.shift();
  if (!next) return;
  next.run();
  idle(warm, { timeout: 2500 });
};
// Start only once the preloader / page-open reveal has fully finished, so the intro never stutters.
const html = document.documentElement;
const intro = () => html.classList.contains("is-loading") || html.classList.contains("is-revealing");
const startWarm = () => {
  if (!intro()) { setTimeout(() => idle(warm, { timeout: 2500 }), 800); return; }
  const mo = new MutationObserver(() => { if (!intro()) { mo.disconnect(); startWarm(); } });
  mo.observe(html, { attributes: true, attributeFilter: ["class"] });
};
if (document.readyState === "complete") startWarm();
else addEventListener("load", startWarm, { once: true });
