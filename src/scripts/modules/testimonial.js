// Client Stories (Testimonials.astro) — ported 1:1 from Uniflow-Client-Stories-Final.html.
// 1. Prev/next cycle 4 testimonials (slide 1 is the server-rendered markup).
// 2. The client logo is redrawn as Bayer-dithered dots that morph between logos and
//    get pushed away from the pointer.

// Dot colour: nearest data-ink (defaults to black).
import { BAYER4, inkOf, reducedMotion as reduced, watchVisibility } from "../lib/particles.js";

const SAMPLES = [
  { name: "Ananya Rao", role: "Brand website · Sample", initials: "AR", quote: "“The team turned a complex brief into a <strong>clear, thoughtful website.</strong> Every page feels consistent, and updating content is now simple for our team.”" },
  { name: "Rohan Mehta", role: "Digital product · Sample", initials: "RM", quote: "“From the first review to the final handover, the collaboration was <strong>focused and dependable.</strong> The new experience is easier to use and feels true to our brand.”" },
  { name: "Meera Kapoor", role: "Webflow build · Sample", initials: "MK", quote: "“They translated our designs with <strong>care and precision.</strong> Responsive details, interactions, and the content setup all received the attention they needed.”" },
];
const TOTAL = SAMPLES.length + 1;
const LOGO_TEXT = ["Pineapple", "ATELIER", "NEXUS", "FORM & FIELD"];
const LOGO_LABELS = ["Pineapple client logo", "Atelier sample logo", "Nexus sample logo", "Form & Field sample logo"];

function initSlides(root, onChange) {
  const article = root.querySelector("[data-stories-article]");
  const index = root.querySelector("[data-stories-index]");
  const original = article.innerHTML;
  let current = 0;

  function render() {
    if (current === 0) article.innerHTML = original;
    else {
      const s = SAMPLES[current - 1];
      article.innerHTML =
        `<blockquote class="stories-trim heading-32 text-grey-40">${s.quote}</blockquote>` +
        `<footer class="stories-author flex items-center gap-figma-16"><div class="stories-initials" aria-hidden="true">${s.initials}</div>` +
        `<div class="stories-author-details flex flex-col"><p class="stories-trim heading-16 font-bold">${s.name}</p>` +
        `<p class="stories-trim heading-16 text-grey-60">${s.role}</p></div></footer>`;
    }
    index.innerHTML = `${String(current + 1).padStart(2, "0")} <span class="text-border">/ ${String(TOTAL).padStart(2, "0")}</span>`;
    onChange(current);
    if (!reduced.matches) {
      article.animate([{ opacity: 0.3, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 280, easing: "ease-out" });
    }
  }
  const move = (delta) => {
    current = (current + delta + TOTAL) % TOTAL;
    render();
  };

  root.querySelector("[data-stories-prev]").addEventListener("click", () => move(-1));
  root.querySelector("[data-stories-next]").addEventListener("click", () => move(1));
  root.querySelector(".stories-controls").addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  });
}

function initLogo(wrap) {
  const image = wrap.querySelector("img");
  const canvas = document.createElement("canvas");
  canvas.className = "stories-particles";
  canvas.setAttribute("aria-hidden", "true");
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const sc = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sc) return () => {};

  const settings = { grid: 3, radius: 260, displacement: 29, smoothness: 0.12, duration: 850 };
  const padding = 35;
  const bayer = BAYER4;
  const ink = inkOf(wrap);
  let dotRadius = 0.7;
  let width = 1, height = 1, index = 0, particles = [], targets = [], startTime = 0;
  let morphing = false, raf = 0, visible = true, ready = false;
  const pointer = { x: -1000, y: -1000, sx: -1000, sy: -1000 };

  // Logo 1 is the real image; 2–4 are placeholder wordmarks.
  function logoSource(i) {
    if (i === 0) return image;
    const c = document.createElement("canvas");
    c.width = 642;
    c.height = 482;
    const g = c.getContext("2d");
    g.fillStyle = "#000";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `${i === 3 ? 44 : 56}px Arial`;
    g.fillText(LOGO_TEXT[i], 321, 241, 500);
    return c;
  }

  function pointsFor(i) {
    const img = logoSource(i);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    sc.clearRect(0, 0, sample.width, sample.height);
    const scale = Math.min(width / iw, height / ih) * (i === 0 ? 1.25 : 1.5625) * (height <= 100 ? 1.8 : 1);
    sc.drawImage(img, (width - iw * scale) / 2, (height - ih * scale) / 2, iw * scale, ih * scale);
    const pixels = sc.getImageData(0, 0, sample.width, sample.height).data;
    const points = [];
    const g = settings.grid;
    for (let y = 0; y < height; y += g) {
      for (let x = 0; x < width; x += g) {
        const ix = Math.min(sample.width - 1, Math.floor(x + g / 2));
        const iy = Math.min(sample.height - 1, Math.floor(y + g / 2));
        const p = (iy * sample.width + ix) * 4;
        if (pixels[p + 3] < 21) continue;
        const lum = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
        const value = Math.max(0, Math.min(1, (lum - 0.5) * 2 + 0.5));
        if (value >= (bayer[Math.floor(y / g) % 4][Math.floor(x / g) % 4] + 0.5) / 16) continue;
        points.push({ x: x + g / 2, y: y + g / 2 });
      }
    }
    return points;
  }

  // Z-order (Morton) key: pairs nearby parts of the old and new silhouettes.
  function spatialKey(p) {
    const spread = (v) => {
      v = (v | (v << 8)) & 0x00ff00ff;
      v = (v | (v << 4)) & 0x0f0f0f0f;
      v = (v | (v << 2)) & 0x33333333;
      v = (v | (v << 1)) & 0x55555555;
      return v;
    };
    const x = Math.max(0, Math.min(65535, Math.floor((p.x / width) * 65535)));
    const y = Math.max(0, Math.min(65535, Math.floor((p.y / height) * 65535)));
    return (spread(x) | (spread(y) << 1)) >>> 0;
  }

  function pairTargets(points) {
    const sorted = [...points].sort((a, b) => spatialKey(a) - spatialKey(b));
    const ordered = [...particles].sort((a, b) => spatialKey(a) - spatialKey(b));
    ordered.forEach((p, i) => {
      const q = sorted[Math.min(sorted.length - 1, Math.floor(((i + 0.5) * sorted.length) / ordered.length))];
      p.fromX = p.x;
      p.fromY = p.y;
      p.toX = q.x;
      p.toY = q.y;
    });
  }

  const ease = (t) => t * t * (3 - 2 * t);

  function advance(now) {
    if (!morphing) return;
    const t = Math.min(1, Math.max(0, (now - startTime) / settings.duration));
    const e = ease(t);
    for (const p of particles) {
      p.x = p.fromX + (p.toX - p.fromX) * e;
      p.y = p.fromY + (p.toY - p.fromY) * e;
    }
    if (t === 1) morphing = false;
  }

  function draw(now) {
    raf = 0;
    advance(now);
    pointer.sx += (pointer.x - pointer.sx) * settings.smoothness;
    pointer.sy += (pointer.y - pointer.sy) * settings.smoothness;
    ctx.clearRect(0, 0, width + padding * 2, height + padding * 2);
    ctx.fillStyle = ink;
    ctx.beginPath();
    for (const p of particles) {
      const dx = p.x - pointer.sx;
      const dy = p.y - pointer.sy;
      const d = Math.hypot(dx, dy);
      const f = reduced.matches ? 0 : d < settings.radius ? Math.pow(1 - d / settings.radius, 2) : 0;
      const a = Math.atan2(dy, dx);
      const x = p.x + padding + Math.cos(a) * settings.displacement * f;
      const y = p.y + padding + Math.sin(a) * settings.displacement * f;
      ctx.moveTo(x + dotRadius, y);
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    }
    ctx.fill();
    if (visible && (morphing || Math.abs(pointer.x - pointer.sx) > 0.05 || Math.abs(pointer.y - pointer.sy) > 0.05)) wake();
  }

  function wake() {
    if (!raf && visible) raf = requestAnimationFrame(draw);
  }

  function setLabel() {
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", LOGO_LABELS[index]);
  }

  function resize() {
    if (!image.naturalWidth) return;
    const r = wrap.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    settings.grid = height <= 100 ? 1.3 : 3;
    dotRadius = height <= 100 ? 0.42 : 0.7;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((width + padding * 2) * dpr);
    canvas.height = Math.round((height + padding * 2) * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sample.width = Math.ceil(width);
    sample.height = Math.ceil(height);
    targets = [0, 1, 2, 3].map(pointsFor);
    // Stable population across all four logos, even where dots share a destination.
    const count = Math.max(...targets.map((t) => t.length));
    const initial = targets[index];
    if (!initial.length) return;
    particles = Array.from({ length: count }, (_, id) => {
      const q = initial[Math.floor((id * initial.length) / count)];
      return { x: q.x, y: q.y, fromX: q.x, fromY: q.y, toX: q.x, toY: q.y };
    });
    morphing = false;
    wrap.classList.add("is-ready");
    image.style.visibility = "hidden";
    ready = true;
    setLabel();
    wake();
  }

  wrap.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || reduced.matches) return;
    const r = wrap.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    wake();
  });
  wrap.addEventListener("pointerleave", () => {
    pointer.x = pointer.y = -1000;
    wake();
  });
  new ResizeObserver(resize).observe(wrap);
  watchVisibility(wrap, (v) => {
    visible = v;
    if (visible) wake();
  }, "0px");
  if (image.complete) resize();
  else image.addEventListener("load", resize, { once: true });

  // Morph to logo `next`
  return (next) => {
    if (!ready) {
      index = next;
      return;
    }
    advance(performance.now());
    index = next;
    pairTargets(targets[index]);
    setLabel();
    startTime = performance.now();
    morphing = !reduced.matches;
    if (!morphing) for (const p of particles) { p.x = p.toX; p.y = p.toY; }
    wake();
  };
}

document.querySelectorAll("[data-stories]").forEach((root) => {
  const logo = root.querySelector("[data-stories-logo]");
  const morphTo = logo ? initLogo(logo) : () => {};
  initSlides(root, morphTo);
});
