// Lenis smooth scroll (from Webflow body embed; jQuery handlers rewritten in vanilla JS)
// Desktop: scrolls the window. Touch devices: scrolls the fixed <body> (html is locked so the mobile
// browser bars stay put — see "Page scroll" in global.css and the shim in Layout.astro).
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const bodyScroller = !!window.__bodyScroller;

// No trackpad swipe back/forward: a sideways two-finger swipe that nothing on the page can scroll
// would otherwise reach Chrome/Safari as history navigation (the big ← arrow). `overscroll-behavior`
// in global.css covers most cases; this catches the rest. Sideways-scrollable areas still scroll.
const canScrollX = (el, dx) => {
  for (; el && el !== document.documentElement; el = el.parentElement) {
    const o = getComputedStyle(el).overflowX;
    if ((o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth) {
      if (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
    }
  }
  return false;
};
addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // pinch-zoom / vertical scroll
    if (!canScrollX(e.target instanceof Element ? e.target : null, e.deltaX)) e.preventDefault();
  },
  { passive: false },
);

// Every ScrollTrigger on the site (Stats, overlap, text reveals, Services) follows the same scroller.
// This module is imported first by main.js, so the default is set before any trigger is created.
gsap.registerPlugin(ScrollTrigger);
if (bodyScroller) ScrollTrigger.defaults({ scroller: document.body });

const lenis = new Lenis({
  ...(bodyScroller ? { wrapper: document.body, content: document.documentElement } : {}),
  lerp: 0.075,
  wheelMultiplier: 0.8,
  touchMultiplier: 1,
  gestureOrientation: "vertical",
  normalizeWheel: true,
  smoothTouch: false,
  syncTouch: false,
});

// On the body scroller Lenis watches <html>, which never changes size — re-measure when the page
// content does (lazy sections, fonts, iframes) so the scroll limit stays right.
if (bodyScroller) {
  let t;
  const remeasure = () => {
    clearTimeout(t);
    t = setTimeout(() => lenis.resize(), 100);
  };
  const ro = new ResizeObserver(remeasure);
  [...document.body.children].forEach((child) => ro.observe(child));
}

// Keep ScrollTrigger in step with Lenis' smoothed position
lenis.on("scroll", ScrollTrigger.update);

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

const on = (selector, handler) =>
  document.querySelectorAll(selector).forEach((el) => el.addEventListener("click", handler));

on("[data-lenis-start]", () => lenis.start());
on("[data-lenis-stop]", () => lenis.stop());
on("[data-lenis-toggle]", function () {
  this.classList.toggle("stop-scroll");
  if (this.classList.contains("stop-scroll")) lenis.stop();
  else lenis.start();
});

window.lenis = lenis;
