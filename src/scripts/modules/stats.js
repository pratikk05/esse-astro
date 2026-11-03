// Stats section (Stats.astro)
//  • Numbers count up once when they scroll into view ("12+", "100%", "3-4" — every digit run animates)
//  • Statement words brighten one by one, scrubbed by scroll
//  • White stripes wipe in from the left, labels slide after
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

function countUp(el) {
  const final = el.textContent.trim();
  el.setAttribute("aria-label", final);
  const state = { t: 0 };
  const render = () => (el.textContent = final.replace(/\d+/g, (n) => Math.round(+n * state.t)));
  render();
  gsap.to(state, {
    t: 1,
    duration: 1.6,
    ease: "power3.out",
    onUpdate: render,
    onComplete: () => (el.textContent = final),
    scrollTrigger: { trigger: el, start: "top 92%", once: true },
  });
}

// Split into word spans; each fades from the dim blue to white across the scroll range.
function wordReveal(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", words.join(" "));
  el.innerHTML = words.map((w) => `<span aria-hidden="true">${w}</span>`).join(" ");
  const spans = el.querySelectorAll("span");
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  gsap.fromTo(
    spans,
    { color: token("--color-secondary-light") },
    {
      color: token("--color-white"),
      ease: "none",
      stagger: 0.5,
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        // Responsive range: paragraph height + 13vh, capped at 40vh
        end: () => `+=${Math.min(el.offsetHeight + innerHeight * 0.13, innerHeight * 0.4)}`,
        scrub: true,
        invalidateOnRefresh: true,
      },
    },
  );
}

function stripes(container) {
  const rows = [...container.querySelectorAll("[data-stats-stripe]")];
  const tl = gsap.timeline({ scrollTrigger: { trigger: container, start: "top bottom-=50", once: true } });
  rows.forEach((row, i) => {
    tl.fromTo(row, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65 + i * 0.35, ease: "expo.out" }, 0)
      .fromTo(row.firstElementChild, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: "power2.out" }, 0);
  });
}

document.querySelectorAll("[data-stats]").forEach((section) => {
  if (reduced) return; // final state is already in the markup
  section.querySelectorAll("[data-stats-count]").forEach(countUp);
  section.querySelectorAll("[data-stats-reveal]").forEach(wordReveal);
  section.querySelectorAll("[data-stats-stripes]").forEach(stripes);
});
