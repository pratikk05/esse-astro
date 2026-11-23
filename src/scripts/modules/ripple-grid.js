// Ripple grid — the "Our stack" background (Tools.astro) for every line-grid surface on the site:
// .section-pixel sections, About's stage (.about-grid) and the logo strip (.logo-grid).
// A 12px hairline grid drawn on a canvas that scrolls WITH the content (no fixed layer), and ripples
// out from wherever you click (the prototype's "wake" spring simulation, same constants as Tools).
// Tall sections don't get a giant canvas: the canvas covers the viewport ± a margin and jumps to
// follow the scroll in whole grid rows, so the lines stay pinned to the section.
// Colour matches Tools' fully faded-in line (#8494aa22); about-dissolve.frag paints the same grid.

const HOSTS = ".section-pixel, .about-grid, .logo-grid";
const LINE = "#8494aa22";
const WAKE = "#2929fd45";
const PAD = 320; // px of canvas above/below the viewport
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(width < 62rem)");

function attach(host) {
  const isLayer = !host.matches(".section-pixel"); // .about-grid / .logo-grid are their own layers
  // The logo strip's rows are anchored to its BOTTOM edge so they run straight on into About's grid
  const anchorBottom = host.matches(".logo-grid");
  const section = isLayer ? host.closest("section") || host : host;
  const canvas = document.createElement("canvas");
  canvas.className = "ripple-grid";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");

  // k: simulate in the prototype's units (desktop 16px cells zoomed 0.75 → 12px on screen)
  let k = 1, step = 16, w = 0, h = 0, top = 0, hostH = 0, columns = 0, rows = 0;
  let nodes = [], waves = [], frame = 0, visible = false;

  function build() {
    k = mobile.matches ? 1 : 0.75;
    step = 12 / k;
    const cw = host.clientWidth;
    hostH = host.clientHeight;
    const lift = anchorBottom ? 12 - (hostH % 12 || 12) : 0;
    canvas.style.top = `${-lift}px`;
    const ch = Math.min(hostH + lift, innerHeight + PAD * 2);
    if (!cw || !ch) return false;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.style.height = `${ch}px`;
    canvas.width = Math.round(cw * d);
    canvas.height = Math.round(ch * d);
    ctx.setTransform(d * k, 0, 0, d * k, 0, 0);
    w = cw / k; h = ch / k;
    columns = Math.ceil(w / step) + 1;
    rows = Math.ceil(h / step) + 1;
    nodes = Array.from({ length: columns * rows }, (_, i) => ({ x: (i % columns) * step, y: Math.floor(i / columns) * step, dx: 0, dy: 0, vx: 0, vy: 0 }));
    return true;
  }

  // Keep the canvas over the visible part of the host; move it in whole 12px rows so lines don't shift
  function follow(force) {
    const r = host.getBoundingClientRect();
    const ch = canvas.clientHeight;
    // visible slice of the host, clamped to it (a host whose top edge is on screen has a negative
    // -r.top; unclamped, that re-placed the canvas every frame and wiped every ripple)
    const visTop = Math.max(0, -r.top), visBottom = Math.min(hostH, -r.top + innerHeight);
    if (!force && visTop >= top && visBottom <= top + ch) return false;
    const next = Math.max(0, Math.min(hostH - ch, visTop - PAD));
    top = Math.floor(next / 12) * 12;
    canvas.style.transform = `translateY(${top}px)`;
    for (const p of nodes) p.dx = p.dy = p.vx = p.vy = 0;
    return true;
  }

  const schedule = () => { if (!frame && nodes.length) frame = requestAnimationFrame(draw); };
  const segment = (a, b) => { ctx.moveTo(a.x + a.dx, a.y + a.dy); ctx.lineTo(b.x + b.dx, b.y + b.dy); };

  function draw(now) {
    frame = 0;
    const quiet = reduced.matches;
    waves = quiet ? [] : waves.filter((wv) => now - wv.time < 1000);
    const oy = top / k; // canvas offset inside the host, in sim units
    let moving = false;
    for (const p of nodes) {
      let tx = 0, ty = 0;
      for (const wave of waves) {
        const age = now - wave.time, x = p.x - wave.x, y = p.y + oy - wave.y, distance = Math.hypot(x, y), offset = distance - age * 0.32;
        if (distance && Math.abs(offset) < 48) {
          const amplitude = wave.strength * Math.sin(offset / 13) * (1 - Math.abs(offset) / 48) * (1 - age / 1000);
          tx += (x / distance) * amplitude; ty += (y / distance) * amplitude;
        }
      }
      p.vx = quiet ? 0 : (p.vx + (tx - p.dx) * 0.16) * 0.76;
      p.vy = quiet ? 0 : (p.vy + (ty - p.dy) * 0.16) * 0.76;
      p.dx = quiet ? 0 : p.dx + p.vx;
      p.dy = quiet ? 0 : p.dy + p.vy;
      moving ||= Math.abs(p.dx) + Math.abs(p.dy) + Math.abs(p.vx) + Math.abs(p.vy) > 0.07;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = mobile.matches ? 0.6375 : 0.85;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const p = nodes[y * columns + x];
      if (x) segment(nodes[y * columns + x - 1], p);
      if (y) segment(nodes[(y - 1) * columns + x], p);
    }
    ctx.stroke();
    if (moving) {
      ctx.strokeStyle = WAKE;
      ctx.beginPath();
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const p = nodes[y * columns + x];
        if (Math.hypot(p.dx, p.dy) < 1.4) continue;
        if (x) segment(nodes[y * columns + x - 1], p);
        if (y) segment(nodes[(y - 1) * columns + x], p);
      }
      ctx.stroke();
    }
    if (moving || waves.length) schedule();
  }

  // Follow the scroll only while on screen
  let loop = 0;
  const tick = () => {
    loop = 0;
    if (!visible) return;
    if (follow(false)) schedule();
    loop = requestAnimationFrame(tick);
  };

  function resize() {
    if (!build()) return;
    follow(true);
    schedule();
  }

  section.addEventListener("click", (e) => {
    if (reduced.matches || !w || e.target.closest("a, button, input, textarea, select, label, [role='button']")) return;
    const r = host.getBoundingClientRect();
    waves.push({ x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, time: performance.now(), strength: 14 });
    if (waves.length > 7) waves.shift();
    schedule();
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !loop) loop = requestAnimationFrame(tick);
  }).observe(host);
  new ResizeObserver(resize).observe(host);
  addEventListener("resize", resize);
  mobile.addEventListener("change", resize);
  reduced.addEventListener("change", schedule);
  resize();
}

document.querySelectorAll(HOSTS).forEach(attach);
