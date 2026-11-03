// Lenis smooth scroll (from Webflow body embed; jQuery handlers rewritten in vanilla JS)
import Lenis from "lenis";

const lenis = new Lenis({
  lerp: 0.075,
  wheelMultiplier: 0.8,
  touchMultiplier: 1,
  gestureOrientation: "vertical",
  normalizeWheel: true,
  smoothTouch: false,
  syncTouch: false,
});

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
