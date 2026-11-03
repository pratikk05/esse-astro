// Selected Works hover preview (Works.astro + WorkCard.astro).
// One shared Mac-style window follows the cursor while a work card is hovered and
// cycles through that card's gallery with a bottom-up wipe. Mouse/trackpad only.
import gsap from "gsap";

const CYCLE = 0.9; // seconds per screen
const fine = matchMedia("(hover: hover) and (pointer: fine)");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

function initPreview(preview) {
  const screen = preview.querySelector("[data-work-preview-screen]");
  const section = preview.closest("section");
  const cards = [...section.querySelectorAll("[data-work-card]")];

  // The anchor (zero-size) trails the cursor; label + window are offset from it in CSS,
  // so the window hangs below-right of the pointer instead of covering it.
  const parts = [preview.querySelector("[data-work-preview-label]"), preview.querySelector("[data-work-preview-window]")];
  gsap.set(preview, { autoAlpha: 0 });
  gsap.set(parts, { scale: 0.6, transformOrigin: "0% 0%" });
  const ring = preview.querySelector("[data-work-preview-ring]");
  gsap.set(ring, { scale: 0 });
  const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" });
  const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });

  addEventListener("pointermove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  }, { passive: true });

  // Preload every gallery once the section gets close
  const galleries = new Map(cards.map((card) => [card, JSON.parse(card.dataset.workGallery || "[]")]));
  new IntersectionObserver(([entry], io) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    galleries.forEach((srcs) => srcs.forEach((src) => (new Image().src = src)));
  }, { rootMargin: "50%" }).observe(section);

  let cycle = null;
  let z = 1;

  function showScreen(src, animate) {
    const img = new Image();
    img.src = src;
    img.alt = "";
    img.style.zIndex = String(++z);
    screen.append(img);
    const prev = [...screen.children].slice(0, -1);
    if (!animate) return prev.forEach((n) => n.remove());
    gsap.fromTo(img, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.15 }, {
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      duration: 0.7,
      ease: "expo.inOut",
      onComplete: () => prev.forEach((n) => n.remove()),
    });
  }

  function show(card, e) {
    const srcs = galleries.get(card);
    if (!srcs.length) return;
    // Jump to the cursor if the window was hidden, so it doesn't fly in from the last card
    if (gsap.getProperty(preview, "opacity") < 0.05) {
      gsap.set(preview, { x: e.clientX, y: e.clientY });
      xTo(e.clientX, e.clientX);
      yTo(e.clientY, e.clientY);
    }
    let i = 0;
    showScreen(srcs[0], false);
    cycle?.kill();
    if (!reduced.matches && srcs.length > 1) {
      cycle = gsap.delayedCall(CYCLE, function next() {
        i = (i + 1) % srcs.length;
        showScreen(srcs[i], true);
        cycle = gsap.delayedCall(CYCLE, next);
      });
    }
    gsap.to(preview, { autoAlpha: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    gsap.to(parts, { scale: 1, duration: 0.6, ease: "expo.out", stagger: 0.05, overwrite: "auto" });
    gsap.to(ring, { scale: 1, duration: 0.5, ease: "back.out(2)", overwrite: "auto" });
  }

  function hide() {
    cycle?.kill();
    cycle = null;
    gsap.to(preview, { autoAlpha: 0, duration: 0.3, ease: "power2.in", overwrite: "auto" });
    gsap.to(parts, { scale: 0.6, duration: 0.35, ease: "power3.in", overwrite: "auto" });
    gsap.to(ring, { scale: 0, duration: 0.3, ease: "power3.in", overwrite: "auto" });
  }

  cards.forEach((card) => {
    card.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && show(card, e));
    card.addEventListener("pointerleave", hide);
  });
}

if (fine.matches) document.querySelectorAll("[data-work-preview]").forEach(initPreview);
