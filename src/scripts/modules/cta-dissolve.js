// CTA reveal — the same move as About → Stats: the CTA is pinned in place while a white dithered veil
// (the FAQ's colour) is eaten away from the bottom up, so the blue rises through the pixels.
// The scene is tucked under the FAQ's bottom half (Cta.astro), so the reveal starts as the FAQ
// passes the middle of the screen and finishes as it leaves. Reduced motion: no veil (CSS).
const CELL = 8;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp = (v) => Math.min(1, Math.max(0, v));
const hash = (x) => {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const wave = (x) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

function init(scene) {
  const stage = scene.querySelector(".cta-stage");
  const canvas = scene.querySelector("[data-cta-veil]");
  if (!stage || !canvas) return;
  const ctx = canvas.getContext("2d");
  const color = getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim() || "#fff";
  const action = stage.querySelector(".cta-action");
  let w = 0, h = 0, dpr = 1, top = 0, travel = 1, last = -1, active = false, actionTop = 0.4;

  const measure = () => {
    dpr = Math.min(devicePixelRatio, 2);
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    top = scene.getBoundingClientRect().top + scrollY;
    travel = Math.max(1, scene.offsetHeight - h);
    // where the button sits in the stage (0 top → 1 bottom): it is live once the veil has cleared it
    if (action) {
      const a = action.getBoundingClientRect(), st = stage.getBoundingClientRect();
      actionTop = (a.top - st.top) / Math.max(1, st.height);
    }
    last = -1;
    draw();
  };

  function draw() {
    if (!active) return;
    const p = clamp((scrollY - top) / travel);
    if (Math.abs(p - last) < 0.002) return;
    last = p;
    canvas.style.visibility = p >= 1 ? "hidden" : "";
    // The white/blue boundary travels from below the bottom edge to above the top edge.
    const front = 1.35 - p * 1.9;
    // The button is only disabled while the SOLID part of the veil covers it (that sits ~0.2 above the
    // dithered front): once that has cleared the button's top edge it is visible — hover + click work,
    // even with a few loose pixels still drifting over it.
    stage.classList.toggle("is-veiled", p < 1 && front - 0.2 > actionTop);
    if (p >= 1) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    for (let c = 0; c < cols; c++) {
      const bump = wave(c * 0.045) * 0.22 + wave(c * 0.13 + 9) * 0.08;
      for (let r = 0; r < rows; r++) {
        const y = (r + 0.5) / rows; // 0 top → 1 bottom
        const density = clamp((front - y - bump + 0.15) * 3);
        if (density <= BAYER[(r & 3) * 4 + (c & 3)]) continue;
        const grow = clamp((density - 0.5) / 0.45);
        const size = grow >= 1 ? CELL : Math.round(3 + (CELL - 3) * grow * grow);
        const off = Math.floor((CELL - size) / 2);
        ctx.fillRect(c * CELL + off, r * CELL + off, size, size);
      }
    }
  }

  new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    last = -1;
    draw();
  }, { rootMargin: "100px" }).observe(scene);
  addEventListener("scroll", draw, { passive: true });
  addEventListener("resize", measure);
  new ResizeObserver(measure).observe(document.body);
  measure();
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-cta-scene]").forEach(init);
}
