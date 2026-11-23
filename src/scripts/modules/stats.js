// Stats section (Stats.astro)
//  • Numbers roll in like odometers once they scroll into view ("12+", "100%", "3-4")
//  • Statement words brighten one by one, scrubbed by scroll
//  • White stripes wipe in from the left, labels slide after
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Odometer: every digit is a column of numbers that spins (a full turn or two) and eases into place,
// columns staggered left → right; symbols (+ % -) rise through the same masks. Plays once on view,
// then the plain text is restored so the number stays crisp and responsive.
function odometer(el) {
  const final = el.textContent.trim();
  const mask = "display:inline-block;height:1lh;overflow:hidden;vertical-align:top";
  const cell = "display:block;height:1lh";
  const cols = [...final].map((ch, i) => {
    const isDigit = /\d/.test(ch);
    const turns = isDigit ? 1 + (i % 2) : 0;
    const seq = isDigit ? [...Array(turns * 10).keys()].map((n) => n % 10).concat([...Array(+ch + 1).keys()]) : [ch];
    return { isDigit, seq, target: seq.length - 1 };
  });
  // screen readers read the number from visually-hidden text (aria-label isn't allowed on a <p>);
  // the spinning digit columns are hidden from them
  el.innerHTML = `<span class="sr-only">${final}</span>` + cols
    .map(({ seq }) => `<span aria-hidden="true" style="${mask}"><span data-od style="display:flex;flex-direction:column">${seq.map((c) => `<span style="${cell}">${c}</span>`).join("")}</span></span>`)
    .join("");
  const strips = [...el.querySelectorAll("[data-od]")];
  const tl = gsap.timeline({
    onComplete: () => (el.textContent = final),
    scrollTrigger: { trigger: el, start: "top 85%", once: true },
  });
  strips.forEach((strip, i) => {
    const { isDigit, seq, target } = cols[i];
    if (isDigit) tl.fromTo(strip, { yPercent: 0 }, { yPercent: (-100 * target) / seq.length, duration: 2.4 + i * 0.15, ease: "power4.out" }, i * 0.1);
    else tl.fromTo(strip, { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: "expo.out" }, 0.25 + i * 0.08);
  });
}

// Word highlight, scrubbed by scroll — every time, both directions. Progress comes from the
// paragraph's live on-screen position each frame (not pre-computed trigger points), so it stays right
// however the page above changes height (pinned About scene, late-loading sections). Each word blends
// from the dim blue to white with a soft two-word overlap.
function wordReveal(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", words.join(" "));
  el.innerHTML = words.map((w) => `<span aria-hidden="true" style="color:color-mix(in srgb, var(--color-white) calc(var(--w, 0) * 100%), var(--color-secondary-light))">${w}</span>`).join(" ");
  const spans = [...el.querySelectorAll("span")];
  const n = spans.length, SPREAD = 2;
  let raf = 0, visible = false, last = -1;
  const frame = () => {
    raf = 0;
    const r = el.getBoundingClientRect(), vh = innerHeight;
    const range = Math.min(r.height + vh * 0.13, vh * 0.4); // same responsive range as before
    const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / range));
    if (Math.abs(p - last) > 0.0005) {
      last = p;
      const head = p * (n + SPREAD);
      spans.forEach((s, i) => s.style.setProperty("--w", Math.min(1, Math.max(0, (head - i) / SPREAD)).toFixed(3)));
    }
    if (visible) raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: "20% 0px" }).observe(el);
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
  section.querySelectorAll("[data-stats-count]").forEach(odometer);
  section.querySelectorAll("[data-stats-reveal]").forEach(wordReveal);
  section.querySelectorAll("[data-stats-stripes]").forEach(stripes);
});
