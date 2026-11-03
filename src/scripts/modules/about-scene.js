// "Who we are" scroll scene (About.astro).
//  • Sticky stage: metallic loop sculpture (Three.js) turns and shrinks with scroll
//  • Opening copy leaves → statement words darken in → image tiles rise and fall
//  • Last 1.1 viewports: the stage dissolves through a pixel mask, revealing <Stats /> underneath
// Reduced motion / no WebGL: no smoothing, and the stage simply fades out instead of dissolving.
import gsap from "gsap";

const STORY_END = 0.73; // story progress reached when the dissolve starts
const DISSOLVE_VH = 1.1; // viewports of scroll the dissolve takes

const { clamp, interpolate } = gsap.utils;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp(0, 1, (v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function initAboutScene(sceneEl) {
  const $ = (sel) => sceneEl.querySelector(sel);
  const stage = $("[data-about-stage]");
  const canvas = $("[data-about-canvas]");
  const grid = $("[data-about-grid]");
  const strip = $("[data-about-strip]");
  const title = $("[data-about-title]");
  const note = $("[data-about-note]");
  const statement = $("[data-about-statement]");
  const words = [...statement.querySelectorAll(".about-word")];
  const gallery = $("[data-about-gallery]");
  const tiles = [...sceneEl.querySelectorAll("[data-about-tile]")];
  const hint = $("[data-about-hint]");
  const next = sceneEl.nextElementSibling; // <Stats />

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const wordColor = interpolate(token("--color-border"), token("--color-grey-90"));

  // ---- Scroll geometry (relative to the scene, wherever it sits on the page) ----
  let sceneTop = 0;
  let storyTravel = 1;
  let vh = innerHeight;
  function measure() {
    vh = innerHeight;
    sceneTop = sceneEl.getBoundingClientRect().top + scrollY;
    storyTravel = Math.max(1, sceneEl.offsetHeight - vh * (1 + DISSOLVE_VH));
  }

  // ---- Three.js ----
  // Three.js (~half the site's JS) is fetched only once the scene is near the viewport;
  // the scroll story runs immediately and the sculpture joins when it's ready.
  let gl = null;
  let dissolve = false;
  const sculptureIO = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    sculptureIO.disconnect();
    import("./about-sculpture.js")
      .then(({ createSculpture }) => {
        gl = createSculpture(canvas, token);
        dissolve = !reduced;
        resize();
        lastP = -1; // force a DOM refresh with the dissolve state
      })
      .catch((error) => {
        canvas.hidden = true;
        console.error(error);
      });
  }, { rootMargin: "150% 0px" });
  sculptureIO.observe(sceneEl);

  function resize() {
    measure();
    gl?.resize(innerWidth, stage.offsetHeight);
  }
  resize();
  addEventListener("resize", resize);
  new ResizeObserver(measure).observe(document.body); // content above may change height

  // Pointer parallax on the sculpture
  const pointer = { x: 0, y: 0 };
  let px = 0;
  let py = 0;
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  // Only animate while the scene (or the start of Stats) is on screen
  let active = false;
  new IntersectionObserver(([entry]) => (active = entry.isIntersecting), { rootMargin: "100px" }).observe(sceneEl);

  let progress = 0;
  let last = 0;
  let lastP = -1;
  let lastT = -1;
  const entrySpace = () => clamp(88.2, 147, vh * 0.1372);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    if (!active) return;

    const local = scrollY - sceneTop;
    const target = clamp(0, 1, (local / storyTravel) * STORY_END);
    progress = reduced ? target : lerp(progress, target, 1 - Math.exp(-dt * 11));
    const p = progress;
    const t = clamp(0, 1, (local - storyTravel) / (vh * DISSOLVE_VH));

    // DOM updates only when scroll state changed
    if (Math.abs(p - lastP) > 1e-4 || t !== lastT) {
      lastP = p;
      lastT = t;
      updateDom(p, t);
    }

    if (gl) {
      px = lerp(px, pointer.x, dt * 2);
      py = lerp(py, pointer.y, dt * 2);
      gl.render({ p, t: dissolve ? t : 0, enter: smooth(0.12, 0.34, p), time: reduced ? 0 : now * 0.00012, px, py });
    }
  }

  function updateDom(p, t) {
    // Dissolve: stage goes see-through so the masked canvas reveals Stats; without the shader, fade it.
    stage.style.backgroundColor = t > 0 && dissolve ? "transparent" : "";
    stage.style.opacity = dissolve ? "" : String(1 - t);
    grid.style.visibility = t > 0 ? "hidden" : "";
    if (next && !reduced) next.style.setProperty("--stats-entry-space", `${lerp(entrySpace(), 0, smooth(0.78, 1, t))}px`);

    // Opening copy leaves
    strip.style.opacity = String(1 - smooth(0.06, 0.16, p));
    const titleOut = smooth(0.02, 0.16, p);
    title.style.opacity = String(1 - titleOut);
    title.style.transform = `translateY(${-titleOut * 65}px)`;
    note.style.opacity = String(1 - smooth(0.02, 0.13, p));
    hint.style.opacity = String(1 - smooth(0.015, 0.12, p));

    // Statement rises in, words darken one by one, then it drifts up and out
    const enter = smooth(0.12, 0.34, p);
    const leave = smooth(0.59, 0.83, p);
    statement.style.transform = `translateY(${lerp(88, 0, enter) - leave * vh * 0.45}px)`;
    statement.style.opacity = String(enter * (1 - smooth(0.63, 0.78, p)));
    if (!reduced) words.forEach((word, i) => (word.style.color = wordColor(smooth(0.16 + i * 0.008, 0.26 + i * 0.008, p))));

    // Tiles rise in a wave, bob, then fall away
    tiles.forEach((tile, i) => {
      const up = smooth(0.31 + i * 0.014, 0.48 + i * 0.014, p);
      const down = smooth(0.64 + i * 0.009, 0.84 + i * 0.009, p);
      const y = (1 - up) * 180 - down * vh * 0.26 + Math.sin(p * 4 + i * 0.7) * 9;
      tile.style.transform = `translateY(${y}px) rotate(${(1 - up) * (i - 3.5) * 3}deg)`;
      tile.style.opacity = String(up * (1 - down));
    });
    gallery.style.transform = `translateX(${-smooth(0.48, 0.8, p) * innerWidth * 0.04}px)`;
  }

  requestAnimationFrame(frame);
}

document.querySelectorAll("[data-about-scene]").forEach(initAboutScene);
