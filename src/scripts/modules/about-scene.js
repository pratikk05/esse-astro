// "Let's talk" scroll scene (About.astro, #about).
//  • Sticky stage: dithered CRT TV (Three.js) turns to face you and changes channel with the story
//  • A two-beat conversation (the problem → how we help) swaps in the card with a masked word reveal
//  • Opening copy leaves → beats reveal → project glimpses rise and drift away
//  • Last 1.1 viewports: the stage dissolves through a pixel mask, revealing <Stats /> underneath
// Reduced motion / no WebGL: no smoothing, and the stage simply fades out instead of dissolving.
import gsap from "gsap";

const STORY_END = 0.73; // story progress reached when the dissolve starts
const DISSOLVE_VH = 1.1; // viewports of scroll the dissolve takes

const { clamp } = gsap.utils;
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
  const paras = [...statement.querySelectorAll("[data-about-para]")];
  const paraWords = paras.map((para) => [...para.querySelectorAll(".about-word > span")]);
  const caption = $("[data-about-caption]");

  // Beat swap: outgoing words fall away (fast, upward), incoming rise in (expo, staggered by word)
  let currentBeat = -1;
  // Health cards: numbers count between the "typical audit" and "after rebuild" values; the colour,
  // meters, labels and review swap via CSS (.is-good).
  function setInsights(good) {
    const insightNums = [...sceneEl.querySelectorAll("[data-insight-num]")];
    tiles.forEach((tile) => tile.classList.toggle("is-good", good));
    insightNums.forEach((el) => {
      const from = Number(el.textContent), to = Number(good ? el.dataset.good : el.dataset.bad);
      const dec = Number(el.dataset.dec) || 0;
      const state = { v: from };
      const ring = el.closest(".insight-score");
      gsap.to(state, {
        v: to,
        duration: reduced ? 0 : 1.3,
        ease: "power3.out",
        overwrite: true,
        delay: reduced ? 0 : 0.2,
        onUpdate: () => {
          el.textContent = state.v.toFixed(dec);
          ring?.style.setProperty("--ring", state.v.toFixed(1));
        },
      });
    });
  }

  function showBeat(next) {
    const prev = currentBeat;
    currentBeat = next;
    if ((next === 1) !== (prev === 1)) setInsights(next === 1);
    if (reduced) {
      paras.forEach((para, i) => (para.style.visibility = i === next ? "" : "hidden"));
      return;
    }
    if (prev >= 0) {
      gsap.killTweensOf(paraWords[prev]);
      // y: 0 — GSAP would otherwise keep the CSS start offset (translateY(110%)) as a px `y`
      gsap.to(paraWords[prev], { y: 0, yPercent: -110, duration: 0.45, ease: "power3.in", stagger: 0.006, overwrite: true });
    }
    if (next >= 0) {
      paras.forEach((para, i) => (para.style.visibility = i === next || i === prev ? "" : "hidden"));
      gsap.killTweensOf(paraWords[next]);
      gsap.fromTo(
        paraWords[next],
        { y: 0, yPercent: 110, rotate: 3 },
        { y: 0, yPercent: 0, rotate: 0, duration: 1.05, ease: "expo.out", stagger: 0.022, delay: prev >= 0 ? 0.32 : 0.05, overwrite: true },
      );
    }
  }
  const tiles = [...sceneEl.querySelectorAll("[data-about-tile]")];
  const hint = $("[data-about-hint]");
  const next = sceneEl.nextElementSibling; // <Stats />

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

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
  }, { rootMargin: "75% 0px" }); // not during the initial load at the top; still ready before it's reached
  sculptureIO.observe(sceneEl);

  function resize() {
    measure();
    gl?.resize(innerWidth, stage.offsetHeight);
    // Tell the TV where the statement card ends (layout box, ignoring its scroll transform), so it
    // fits into the space below it at any viewport size instead of running under the card.
    const cardBottom = (statement.offsetTop + statement.offsetHeight) / Math.max(1, stage.offsetHeight);
    gl?.setLayout?.(cardBottom);
    // The project glimpses use the same free band (CSS: .about-tile top)
    stage.style.setProperty("--card-bottom", `${(cardBottom * 100).toFixed(2)}%`);
  }
  new ResizeObserver(() => resize()).observe(statement);
  resize();
  addEventListener("resize", resize);
  new ResizeObserver(measure).observe(document.body); // content above may change height

  // Only animate while the scene (or the start of Stats) is on screen
  let active = false;
  new IntersectionObserver(([entry]) => (active = entry.isIntersecting), { rootMargin: "100px" }).observe(sceneEl);

  // Mouse tilt: the TV leans toward the cursor (desktop / fine pointers only, not reduced motion).
  // Smoothed here; the canvas redraws only while the tilt is still settling.
  const pointer = { x: 0, y: 0 };
  let px = 0;
  let py = 0;
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => (pointer.x = pointer.y = 0));
  }

  let progress = 0;
  let last = 0;
  let lastP = -1;
  let lastT = -1;
  let lastGlP = -1;
  let lastChannel = -1;
  let tvOn = false;
  let lastGlT = -1;
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

    // Ease the tilt toward the pointer
    const k = 1 - Math.exp(-dt * 5);
    const nx = px + (pointer.x - px) * k, ny = py + (pointer.y - py) * k;
    const tilting = Math.abs(nx - px) > 1e-4 || Math.abs(ny - py) > 1e-4;
    px = nx;
    py = ny;

    // Render only when scroll or tilt moved (the TV has no idle motion)
    // CRT power: switch on as the TV settles into view, off again when scrolled back above the scene
    if (gl) {
      const shouldBeOn = p > 0.06;
      if (shouldBeOn !== tvOn) {
        tvOn = shouldBeOn;
        gl.power?.(tvOn);
      }
    }
    const live = gl?.tick?.(now); // the TV screen animates (power-on, grain, roll bar, flicker)
    if (gl && (p !== lastGlP || t !== lastGlT || tilting || live || gl.dirty?.())) {
      lastGlP = p;
      lastGlT = t;
      // TV settles into place (0.04 → 0.16) just before the card has fully arrived (0.10 → 0.18)
      gl.render({ p, t: dissolve ? t : 0, enter: smooth(0.04, 0.16, p), px, py });
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

    // Statement card rises in, then drifts up and out before the dissolve
    const enter = smooth(0.1, 0.18, p);
    const leave = smooth(0.66, 0.76, p);
    statement.style.transform = `translateY(${lerp(88, 0, enter) - leave * vh * 0.35}px)`;
    statement.style.opacity = String(enter * (1 - smooth(0.67, 0.74, p)));

    // The conversation, two beats. Which beat is "live" is decided by scroll; the reveal itself is a
    // timed GSAP animation (words rise out of their masks, staggered; the outgoing beat slides out
    // first), so it always plays at full quality no matter how fast the visitor scrolls.
    const beat = enter < 0.35 ? -1 : p < 0.42 ? 0 : 1;
    if (beat !== currentBeat) showBeat(beat);
    caption.style.opacity = String(enter * (1 - smooth(0.67, 0.74, p)));
    // The TV follows the conversation: no signal → brand-blue word wall
    const channel = p < 0.42 ? 0 : 1;
    if (gl && channel !== lastChannel) {
      lastChannel = channel;
      gl.setChannel(channel);
    }

    // Project glimpses: rise in with statement 2 (staggered), float with parallax by depth, drift away
    tiles.forEach((tile, i) => {
      const depth = Number(tile.dataset.depth) || 1;
      const up = smooth(0.17 + i * 0.03, 0.27 + i * 0.03, p); // rise in with "The problem" (poor audit)
      const down = smooth(0.68 + i * 0.012, 0.82 + i * 0.012, p);
      // rise in from below, float gently in place (never upward into the copy), sink away at the end
      const y = (1 - up) * vh * 0.22 * depth + Math.sin(p * 9 + i * 1.3) * 6 * depth + down * vh * 0.12 * depth;
      tile.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${lerp(0.92, 1, up).toFixed(3)})`;
      tile.style.opacity = String(up * (1 - down));
    });
  }

  requestAnimationFrame(frame);
}

document.querySelectorAll("[data-about-scene]").forEach(initAboutScene);
