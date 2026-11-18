// CRT TV + pixel-dissolve pass for the "Let's talk" scene (About.astro). Loaded on demand by
// about-scene.js, so Three.js is only downloaded when the visitor scrolls near the section.
//
// A realistic, aged set after the reference poster: worn dark-grey cabinet (procedural texture), thick rounded
// bezel, slightly domed glowing screen, FUSE knob and a slim control strip, deep tube housing.
// Everything is built from primitives — no model download, nothing to license.
// The screen is a canvas texture that "changes channel" with the conversation (setChannel):
//   0 — the problem: no signal (live grain)   1 — the answer: a website builds itself, block by block (live)
// Rendering: anti-aliased, ACES filmic, lit by a baked reflection room (one-time cost). It redraws
// on scroll / mouse tilt, and ~30fps for the live screen only while the scene is on screen. During the About → Stats dissolve the frame goes
// through a multisampled target and the box-filling mask (about-dissolve.frag).
import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, CanvasTexture, Color, CubeCamera, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, GLSL3, Group, HalfFloatType, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  OrthographicCamera, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, RGBAFormat, RingGeometry,
  Scene, ShaderMaterial, Shape, SpotLight, Vector2, WebGLCubeRenderTarget, WebGLMultisampleRenderTarget,
  WebGLRenderer, sRGBEncoding,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import dissolveFragment from "./about-dissolve.frag";

const PIXEL_SIZE = 12; // dissolve box size (CSS px) — one box of the stage line grid
const ENV = { intensity: 1.1, highlight: "#d9d4cc" }; // neutral warm ring light, so the grey stays grey
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------------------------
// Screen: a 768×576 canvas texture that animates (~30fps) while the scene is on screen.
//   0 — no signal: moving grain, rolling vertical-hold band, jittering / flickering label
//   1 — build: on a brand-blue grid, website pieces drop in like falling blocks (stepping down cell by
//       cell, sliding into their column) and lock into a page — footer, cards, hero, nav. A BUILD %
//       counter climbs; when the page is whole a SITE LIVE banner shows, the blocks blink out, repeat.
// Expensive layers are pre-rendered once (grain frames, build backdrop, tube overlay); a frame is just
// a few drawImage / fillRect calls.
const SW = 768, SH = 576;
const BRAND = "#2929fd";

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function createScreen(reduced) {
  const canvas = makeCanvas(SW, SH);
  const ctx = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  texture.encoding = sRGBEncoding;
  texture.anisotropy = 4;

  // Grain frames (quarter res, scaled up with nearest-neighbour for chunky TV snow)
  const grain = Array.from({ length: 6 }, () => {
    const c = makeCanvas(SW / 3, SH / 3);
    const g = c.getContext("2d");
    const img = g.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 30 + Math.random() * 190;
      img.data[i] = n * 0.93;
      img.data[i + 1] = n * 0.96;
      img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });

  const glowText = (g, text, x, y, size) => {
    g.save();
    g.font = `800 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.fillStyle = "rgba(255,255,255,0.96)";
    g.shadowColor = "rgba(255,255,255,0.85)";
    g.shadowBlur = size * 0.45;
    g.fillText(text, x, y);
    g.shadowBlur = size * 0.12;
    g.fillText(text, x, y);
    g.restore();
  };
  const osd = (g, text, alpha = 1) => {
    g.save();
    g.globalAlpha = alpha;
    g.font = `500 30px "JetBrains Mono", ui-monospace, monospace`;
    g.fillStyle = "#7df9ff";
    g.shadowColor = "rgba(125,249,255,0.9)";
    g.shadowBlur = 10;
    g.fillText(text, 52, 78);
    g.restore();
  };

  // Build backdrop (static): brand-blue field with a faint cell grid where the page assembles
  const CELL = 24, COLS = 22, ROWS = 16;
  const GX = (SW - COLS * CELL) / 2, GY = 118; // grid origin (528 × 384 px)
  const card = makeCanvas(SW, SH);
  {
    const g = card.getContext("2d");
    const bg = g.createRadialGradient(SW * 0.45, SH * 0.45, 30, SW / 2, SH / 2, SW * 0.7);
    bg.addColorStop(0, "#3a3aff");
    bg.addColorStop(1, BRAND);
    g.fillStyle = bg;
    g.fillRect(0, 0, SW, SH);
    g.fillStyle = "rgba(255,255,255,0.07)";
    for (let c = 0; c <= COLS; c++) g.fillRect(GX + c * CELL, GY, 1, ROWS * CELL);
    for (let r = 0; r <= ROWS; r++) g.fillRect(GX, GY + r * CELL, COLS * CELL, 1);
  }
  // The page, as pieces in cells: [col, row, w, h, colour]. Listed in drop order (bottom-up, so each
  // piece lands on something). from = the column it spawns in before sliding over.
  const INK = { white: "#ffffff", soft: "#bcc9ff", teal: "#1bdbce", dark: "#0a0a3c", sky: "#7f9bff" };
  const PIECES = [
    { c: 0, r: 14, w: 22, h: 2, col: INK.dark, from: 0 },   // footer
    { c: 0, r: 10, w: 8, h: 4, col: INK.teal, from: 6 },    // card 1
    { c: 8, r: 10, w: 7, h: 4, col: INK.white, from: 2 },   // card 2
    { c: 15, r: 10, w: 7, h: 4, col: INK.dark, from: 9 },   // card 3
    { c: 12, r: 3, w: 10, h: 7, col: INK.sky, from: 4, img: true }, // hero image
    { c: 0, r: 8, w: 5, h: 2, col: INK.teal, from: 8 },     // button
    { c: 0, r: 6, w: 8, h: 2, col: INK.soft, from: 5 },     // subline
    { c: 0, r: 3, w: 12, h: 3, col: INK.white, from: 3 },   // headline
    { c: 0, r: 0, w: 5, h: 2, col: INK.white, from: 7 },    // logo
    { c: 12, r: 0, w: 7, h: 2, col: INK.soft, from: 6 },    // nav links
    { c: 19, r: 0, w: 3, h: 2, col: INK.teal, from: 12 },   // nav CTA
  ];
  const DROP = 0.72, LIVE = 1.9, CLEAR = 0.75; // seconds per piece / banner hold / blink-out
  const BUILD = PIECES.length * DROP, CYCLE = BUILD + LIVE + CLEAR;
  const pieceRect = (g, x, y, p, flash) => {
    const w = p.w * CELL - 3, h = p.h * CELL - 3;
    g.fillStyle = p.col;
    g.fillRect(x + 1.5, y + 1.5, w, h);
    if (p.img) { // a little picture inside the hero image block
      g.fillStyle = "rgba(10,10,60,0.35)";
      g.beginPath();
      g.moveTo(x + 10, y + h - 6);
      g.lineTo(x + w * 0.42, y + h * 0.42);
      g.lineTo(x + w * 0.62, y + h * 0.66);
      g.lineTo(x + w * 0.76, y + h * 0.52);
      g.lineTo(x + w - 6, y + h - 6);
      g.fill();
      g.fillStyle = INK.white;
      g.fillRect(x + w * 0.74, y + 14, 14, 14);
    }
    // bevel: light top-left, dark bottom-right — reads as a chunky block on the CRT
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.fillRect(x + 1.5, y + 1.5, w, 3);
    g.fillRect(x + 1.5, y + 1.5, 3, h);
    g.fillStyle = "rgba(0,0,30,0.28)";
    g.fillRect(x + 1.5, y + h - 1.5, w, 3);
    g.fillRect(x + w - 1.5, y + 1.5, 3, h);
    if (flash > 0) {
      g.fillStyle = `rgba(255,255,255,${flash * 0.85})`;
      g.fillRect(x + 1.5, y + 1.5, w, h);
    }
  };
  // One frame of the build at time `bt` (seconds since the channel came on)
  const drawBuild = (g, bt) => {
    const lt = bt % CYCLE;
    const clearing = lt > BUILD + LIVE;
    const blinkOff = clearing && Math.floor((lt - BUILD - LIVE) / 0.12) % 2 === 1;
    const gone = clearing && lt - BUILD - LIVE > CLEAR * 0.8;
    let placed = 0;
    if (!gone) {
      PIECES.forEach((p, i) => {
        const start = i * DROP;
        if (lt < start) return;
        const f = Math.min(1, (lt - start) / (DROP * 0.8)); // land at 80% of the slot, rest after
        if (f >= 1) placed++;
        if (blinkOff) return;
        const row = f >= 1 ? p.r : Math.floor(lerp(-p.h - 1, p.r, f * f)); // steps down cell by cell, accelerating
        const col = f >= 1 ? p.c : Math.round(lerp(p.from, p.c, smooth(0, 0.65, f)));
        const landedFor = lt - start - DROP * 0.8;
        const flash = clearing ? 0.5 : landedFor >= 0 && landedFor < 0.18 ? 1 - landedFor / 0.18 : 0;
        g.save();
        g.beginPath();
        g.rect(GX, GY, COLS * CELL, ROWS * CELL); // pieces enter from above the grid
        g.clip();
        pieceRect(g, GX + col * CELL, GY + row * CELL, p, flash);
        g.restore();
      });
    }
    // HUD: build progress (top right)
    const pct = Math.round((placed / PIECES.length) * 100);
    g.save();
    g.font = `500 26px "JetBrains Mono", ui-monospace, monospace`;
    g.fillStyle = "#7df9ff";
    g.shadowColor = "rgba(125,249,255,0.9)";
    g.shadowBlur = 10;
    g.textAlign = "right";
    g.fillText(`BUILD ${String(pct).padStart(3, " ")}%`, SW - 52, 78);
    g.restore();
    // Complete: SITE LIVE banner
    if (lt > BUILD && !clearing) {
      const k = Math.min(1, (lt - BUILD) / 0.25);
      g.save();
      g.globalAlpha = k;
      g.fillStyle = "rgba(6,6,40,0.86)";
      g.fillRect(SW / 2 - 190, SH / 2 - 44, 380, 92);
      g.strokeStyle = INK.teal;
      g.lineWidth = 3;
      g.strokeRect(SW / 2 - 190, SH / 2 - 44, 380, 92);
      glowText(g, "SITE LIVE", SW / 2 - 150, SH / 2 + 22, 54);
      g.fillStyle = INK.teal;
      g.fillRect(SW / 2 + 128, SH / 2 - 14, 30, 30);
      g.fillStyle = "#06062a";
      g.font = `800 26px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      g.fillText("✓", SW / 2 + 134, SH / 2 + 10);
      g.restore();
    }
  };
  // Tube overlay: scanlines, glare spot, curved-edge vignette
  const tube = makeCanvas(SW, SH);
  {
    const g = tube.getContext("2d");
    g.fillStyle = "rgba(0,0,0,0.14)";
    for (let y = 0; y < SH; y += 3) g.fillRect(0, y, SW, 1.2);
    const glare = g.createRadialGradient(SW * 0.2, SH * 0.2, 0, SW * 0.2, SH * 0.2, SW * 0.16);
    glare.addColorStop(0, "rgba(255,255,255,0.28)");
    glare.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glare;
    g.fillRect(0, 0, SW, SH);
    const v = g.createRadialGradient(SW / 2, SH / 2, SH * 0.42, SW / 2, SH / 2, SW * 0.66);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,8,0.62)");
    g.fillStyle = v;
    g.fillRect(0, 0, SW, SH);
  }
  // Rolling band (a soft horizontal light bar)
  const band = makeCanvas(4, 160);
  {
    const g = band.getContext("2d");
    const lg = g.createLinearGradient(0, 0, 0, 160);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.16)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg;
    g.fillRect(0, 0, 4, 160);
  }

  let channel = 0;
  let channelAt = 0; // when the current channel came on — the build restarts from an empty grid
  let onChange = () => {};
  let lastFrame = -1;
  // Power: 0 = off (black glass). Switching on plays the classic CRT turn-on over ~0.9s:
  // a dot of light → a bright horizontal line → the line opens vertically with a flash → picture.
  let powerOn = false, powerAt = -1e9;
  const POWER_MS = 900;
  const frame = makeCanvas(SW, SH);
  const fctx = frame.getContext("2d");

  function draw(now) {
    const pt = powerOn ? Math.min(1, (now - powerAt) / POWER_MS) : 0;
    if (!powerOn || pt < 1) {
      // draw the picture into the offscreen frame, then composite it through the power-on mask
      drawPicture(now, fctx);
      ctx.fillStyle = "#050607";
      ctx.fillRect(0, 0, SW, SH);
      if (powerOn) {
        const e = (x) => 1 - Math.pow(1 - x, 3);
        const cx = SW / 2, cy = SH / 2;
        if (pt < 0.22) {
          // dot → line
          const k = e(pt / 0.22);
          const w = 6 + (SW - 6) * k;
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "rgba(255,255,255,0.9)";
          ctx.shadowBlur = 24;
          ctx.fillRect(cx - w / 2, cy - 2, w, 4);
          ctx.shadowBlur = 0;
        } else {
          // line opens vertically, the picture squashed inside it, with a fading white flash
          const k = e((pt - 0.22) / 0.78);
          const h = Math.max(4, SH * k);
          ctx.drawImage(frame, 0, 0, SW, SH, 0, cy - h / 2, SW, h);
          ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.85})`;
          ctx.fillRect(0, cy - h / 2, SW, h);
        }
      }
      ctx.drawImage(tube, 0, 0);
      texture.needsUpdate = true;
      return;
    }
    drawPicture(now, ctx);
    ctx.drawImage(tube, 0, 0);
    texture.needsUpdate = true;
  }

  function drawPicture(now, ctx) {
    const t = now / 1000;
    ctx.imageSmoothingEnabled = false;
    if (channel === 0) {
      ctx.drawImage(grain[Math.floor(t * 24) % grain.length], 0, 0, SW, SH);
      // vertical-hold band rolling down
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(band, 0, ((t * 140) % (SH + 160)) - 160, SW, 160);
      const jx = Math.round(Math.sin(t * 37) * 2), flick = 0.85 + Math.random() * 0.15;
      ctx.globalAlpha = flick;
      ctx.fillStyle = "rgba(10,12,20,0.8)";
      ctx.fillRect(SW / 2 - 170 + jx, SH / 2 - 46, 340, 82);
      glowText(ctx, "NO SIGNAL", SW / 2 - 146 + jx, SH / 2 + 14, 56);
      ctx.globalAlpha = 1;
      osd(ctx, "CH 001");
    } else {
      ctx.imageSmoothingEnabled = true;
      const jy = Math.sin(t * 2.1) * 1.2 + (Math.random() < 0.03 ? 3 : 0);
      ctx.save();
      ctx.translate(0, jy);
      ctx.drawImage(card, 0, 0);
      // reduced motion: a still of the finished page
      drawBuild(ctx, reduced ? BUILD + 0.5 : (now - channelAt) / 1000);
      ctx.restore();
      ctx.drawImage(band, 0, ((t * 60) % (SH + 160)) - 160, SW, 160);
      ctx.globalAlpha = 0.07;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(grain[Math.floor(t * 24) % grain.length], 0, 0, SW, SH);
      ctx.globalAlpha = 0.03 + Math.random() * 0.04; // flicker
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, SW, SH);
      ctx.globalAlpha = 1;
      osd(ctx, "CH 002");
    }
    ctx.imageSmoothingEnabled = true;
  }

  return {
    texture,
    set onChange(fn) { onChange = fn; },
    paint(ch) {
      if (ch === channel && lastFrame >= 0) return;
      channel = ch;
      channelAt = performance.now();
      draw(performance.now());
      lastFrame = performance.now();
      onChange();
    },
    /** Switch the set on (plays the turn-on) or off (black glass). */
    power(on) {
      if (on === powerOn) return;
      powerOn = on;
      powerAt = reduced ? -1e9 : performance.now();
      draw(performance.now());
      onChange();
    },
    /** Advance the animation; true when a new frame was drawn (~30fps; every frame while powering on). */
    tick(now) {
      const poweringUp = powerOn && now - powerAt < POWER_MS + 50;
      if (!powerOn && !poweringUp) return false; // off: nothing moves
      if (reduced && !poweringUp) return false;
      if (!poweringUp && now - lastFrame < 33) return false;
      lastFrame = now;
      draw(now);
      return true;
    },
  };
}

// Aged plastic: procedural colour / roughness / bump maps (grain, smudges, scratches, dust, worn edges)
function makeWornMaps() {
  const N = 512;
  const color = makeCanvas(N, N), rough = makeCanvas(N, N);
  const c = color.getContext("2d"), r = rough.getContext("2d");
  c.fillStyle = "#3b3c3e";
  c.fillRect(0, 0, N, N);
  r.fillStyle = "#a8a8a8";
  r.fillRect(0, 0, N, N);
  // fine grain
  const img = c.getImageData(0, 0, N, N), rimg = r.getImageData(0, 0, N, N);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    const m = (Math.random() - 0.5) * 40;
    rimg.data[i] += m; rimg.data[i + 1] += m; rimg.data[i + 2] += m;
  }
  c.putImageData(img, 0, 0);
  r.putImageData(rimg, 0, 0);
  // smudges and discolouration
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * N, y = Math.random() * N, rad = 20 + Math.random() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    const dark = Math.random() < 0.6;
    g.addColorStop(0, dark ? "rgba(10,10,10,0.18)" : "rgba(120,118,112,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gr = r.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = gr;
    r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // scratches (light on colour, glossier on roughness)
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * N, y = Math.random() * N, len = 8 + Math.random() * 60, a = Math.random() * Math.PI;
    c.strokeStyle = `rgba(160,160,155,${0.08 + Math.random() * 0.18})`;
    c.lineWidth = Math.random() < 0.8 ? 0.6 : 1.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    r.strokeStyle = "rgba(40,40,40,0.5)";
    r.lineWidth = c.lineWidth;
    r.beginPath(); r.moveTo(x, y); r.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); r.stroke();
  }
  // dust specks
  for (let i = 0; i < 500; i++) {
    c.fillStyle = `rgba(200,198,190,${Math.random() * 0.25})`;
    c.fillRect(Math.random() * N, Math.random() * N, Math.random() < 0.9 ? 1 : 2, 1);
  }
  // worn border (UV edges ≈ cabinet edges): slightly lighter, rubbed
  const edge = c.createLinearGradient(0, 0, N, 0);
  edge.addColorStop(0, "rgba(150,148,142,0.14)");
  edge.addColorStop(0.06, "rgba(0,0,0,0)");
  edge.addColorStop(0.94, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(150,148,142,0.14)");
  c.fillStyle = edge;
  c.fillRect(0, 0, N, N);

  const map = new CanvasTexture(color);
  map.encoding = sRGBEncoding;
  map.anisotropy = 4;
  const roughnessMap = new CanvasTexture(rough);
  return { map, roughnessMap, bumpMap: roughnessMap };
}

// Rounded rectangle (centred) into a Shape / hole path
function roundedRect(shape, w, h, r) {
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// The TV (after the reference poster). ~3.6 wide × 2.9 tall front, front face at z = +D/2.
function buildTV(screenTexture) {
  const tv = new Group();
  const W = 3.6, H = 2.9, D = 2.4, front = D / 2;
  // Aged dark-grey plastic (procedural wear maps); darker trim for the bezel, strip and buttons
  const lin = (hex) => new Color(hex).convertSRGBToLinear();
  const worn = makeWornMaps();
  const plastic = new MeshStandardMaterial({ map: worn.map, roughnessMap: worn.roughnessMap, bumpMap: worn.bumpMap, bumpScale: 0.004, metalness: 0.04, roughness: 0.78, envMapIntensity: 0.7 });
  const plasticDark = new MeshStandardMaterial({ color: lin("#1d1e20"), roughnessMap: worn.roughnessMap, bumpMap: worn.bumpMap, bumpScale: 0.003, metalness: 0.06, roughness: 0.7, envMapIntensity: 0.7 });
  const button = new MeshStandardMaterial({ color: lin("#111214"), metalness: 0.1, roughness: 0.45, envMapIntensity: 0.7 });
  // Cabinet
  tv.add(new Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.16), plastic));

  // Thick bezel: an extruded rounded frame with a bevel, standing proud of the cabinet
  const sw = 2.98, sh = 2.12, sy = 0.2;
  const frame = roundedRect(new Shape(), sw + 0.36, sh + 0.34, 0.2);
  frame.holes.push(roundedRect(new Shape(), sw, sh, 0.24));
  const bezelGeo = new ExtrudeGeometry(frame, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 12 });
  const bezel = new Mesh(bezelGeo, plasticDark);
  bezel.position.set(0, sy, front - 0.02);
  tv.add(bezel);

  // Domed glass, recessed into the bezel
  const glassGeo = new PlaneGeometry(sw + 0.06, sh + 0.06, 40, 30);
  const gp = glassGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const u = gp.getX(i) / (sw / 2), v = gp.getY(i) / (sh / 2);
    gp.setZ(i, 0.1 * (1 - u * u * 0.85) * (1 - v * v * 0.85));
  }
  glassGeo.computeVertexNormals();
  const glass = new Mesh(glassGeo, new MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
  glass.position.set(0, sy, front - 0.01);
  tv.add(glass);
  // a faint glossy layer over the glass for real reflections
  const gloss = new Mesh(glassGeo, new MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.22, envMapIntensity: 1.6 }));
  gloss.position.copy(glass.position);
  gloss.position.z += 0.004;
  tv.add(gloss);

  // Bottom: FUSE knob on the left, slim control strip with tiny buttons, LED, POWER
  const yb = -1.18;
  const knobGeo = new CylinderGeometry(0.17, 0.18, 0.12, 40);
  knobGeo.rotateX(Math.PI / 2);
  const knob = new Mesh(knobGeo, button);
  knob.position.set(-1.38, yb, front + 0.05);
  tv.add(knob);
  const strip = new Mesh(new RoundedBoxGeometry(2.45, 0.3, 0.06, 3, 0.025), plasticDark);
  strip.position.set(0.32, yb, front + 0.02);
  tv.add(strip);
  const btn = (w, x) => {
    const m = new Mesh(new RoundedBoxGeometry(w, 0.1, 0.05, 2, 0.015), button);
    m.position.set(x, yb, front + 0.055);
    tv.add(m);
  };
  [[-0.38, 0.1], [-0.24, 0.1], [-0.04, 0.17], [0.15, 0.17], [0.4, 0.17], [0.59, 0.17], [1.12, 0.26]].forEach(([x, w]) => btn(w, x + 0.32 - 0.32));
  const led = new Mesh(new CylinderGeometry(0.03, 0.03, 0.04, 16).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: lin("#ff6a3d"), toneMapped: false }));
  led.position.set(0.86, yb, front + 0.05);
  tv.add(led);

  // Deep tube housing at the back (four-sided frustum) and a low plinth
  const backGeo = new CylinderGeometry(0.9, 1.7, 1.5, 4, 1);
  backGeo.rotateY(Math.PI / 4);
  backGeo.rotateX(-Math.PI / 2);
  const back = new Mesh(backGeo, plastic);
  back.position.set(0, 0.12, -D / 2 - 0.7);
  tv.add(back);
  const plinth = new Mesh(new RoundedBoxGeometry(W - 0.3, 0.08, D - 0.4, 2, 0.03), plasticDark);
  plinth.position.set(0, -H / 2 - 0.035, 0);
  tv.add(plinth);
  return tv;
}

// Reflection room (after niccolofanton/dithering-shader's environment.tsx, MIT, light-formers after
// @0xca0a): grey room, soft box lights and a neutral ring, rendered ONCE into a cube map → PMREM.
function bakeEnvironment(renderer) {
  const room = new Scene();
  const g = new Group();
  g.position.y = -0.5;
  room.add(g);
  const box = new BoxGeometry();
  const white = new MeshStandardMaterial({ color: 0xffffff });

  for (const [x, z] of [[-15, 15], [15, 15], [15, -15], [-15, -15]]) {
    const s = new SpotLight(0xffffff, 2, 0, 0.2, 1, 0);
    s.position.set(x, 20, z);
    g.add(s, s.target);
  }
  const p = new PointLight(0xffffff, 100, 28, 2);
  p.position.set(0.5, 14, 0.5);
  g.add(p);

  const shell = new Mesh(box, new MeshStandardMaterial({ color: 0x808080, side: BackSide }));
  shell.position.set(0, 13.2, 0);
  shell.scale.set(31.5, 28.5, 31.5);
  g.add(shell);
  for (const [px, py, pz, ry, sx, sy, sz] of [
    [-10.906, -1.0, 1.846, -0.195, 2.328, 7.905, 4.651],
    [-5.607, -0.754, -0.758, 0.994, 1.97, 1.534, 3.955],
    [6.167, -0.16, 7.803, 0.561, 3.927, 6.285, 3.687],
    [-2.017, 0.018, 6.124, 0.333, 2.002, 4.566, 2.064],
    [2.291, -0.756, -2.621, -0.286, 1.546, 1.552, 1.496],
    [-2.193, -0.369, -5.547, 0.516, 3.875, 3.487, 2.986],
  ]) {
    const m = new Mesh(box, white);
    m.position.set(px, py, pz);
    m.rotation.y = ry;
    m.scale.set(sx, sy, sz);
    g.add(m);
  }

  // drei <Lightformer>: an unlit emitter with colour × intensity (HDR, not tone-mapped)
  const former = (geo, color, intensity, pos, scale, lookAtOrigin) => {
    const m = new Mesh(geo, new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide, toneMapped: false }));
    m.position.set(...pos);
    m.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
    if (lookAtOrigin) m.lookAt(0, 0, 0);
    g.add(m);
  };
  former(new RingGeometry(0.5, 1, 64), ENV.highlight, 15, [2, 3, -2], 10, true);
  for (const [i, pos, sc] of [
    [80, [-14, 10, 8], [0.1, 2.5, 2.5]],
    [80, [-14, 14, -4], [0.1, 2.5, 2.5]],
    [23, [14, 12, 0], [0.1, 5, 5]],
    [16, [0, 9, 14], [5, 5, 0.1]],
    [80, [7, 8, -14], [2.5, 2.5, 0.1]],
    [80, [-7, 16, -14], [2.5, 2.5, 0.1]],
    [1, [0, 20, 0], [0.1, 0.1, 0.1]],
    [20, [0, 15, 0], [10, 1, 10]],
  ]) former(box, 0xffffff, i, pos, sc, false);

  const cubeTarget = new WebGLCubeRenderTarget(256, { type: HalfFloatType, format: RGBAFormat, generateMipmaps: false });
  const cubeCam = new CubeCamera(0.1, 100, cubeTarget);
  // R3F (the demo's renderer) uses physically-correct light units; r128 defaults to legacy units,
  // which blow the room out to white.
  const legacy = renderer.physicallyCorrectLights;
  renderer.physicallyCorrectLights = true;
  cubeCam.update(renderer, room);
  renderer.physicallyCorrectLights = legacy;
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromCubemap(cubeTarget.texture).texture;
  pmrem.dispose();
  cubeTarget.dispose();
  room.traverse((o) => {
    if (o.isMesh) o.material.dispose();
  });
  box.dispose();
  return env;
}

const quadVertex = "out vec2 v_uv; void main() { v_uv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

export function createSculpture(canvas, token) {
  const white = new Color(token("--color-background"));
  const blue = new Color(token("--color-secondary"));

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  scene.environment = bakeEnvironment(renderer);
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.z = 9.5;

  const group = new Group();
  const pose = new Group();
  group.add(pose);
  scene.add(group);
  let needsDraw = true; // the scene only redraws on change, so flag load/resize/channel changes
  const screen = createScreen(matchMedia("(prefers-reduced-motion: reduce)").matches);
  screen.onChange = () => (needsDraw = true);
  screen.paint(0);
  const tv = buildTV(screen.texture);
  tv.scale.setScalar(0.62);
  pose.add(tv);

  // Dissolve (About → Stats): the frame goes to a multisampled, sRGB target, then through the mask
  const target = new WebGLMultisampleRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, encoding: sRGBEncoding });
  target.texture.encoding = sRGBEncoding;
  const maskMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      u_input: { value: target.texture },
      u_bottomProgress: { value: 0 },
      u_resolution: { value: new Vector2(1, 1) },
      u_pixel_size: { value: PIXEL_SIZE },
    },
    vertexShader: quadVertex,
    fragmentShader: dissolveFragment,
  });
  const maskScene = new Scene();
  maskScene.add(new Mesh(new PlaneGeometry(2, 2), maskMaterial));
  const maskCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bufferSize = new Vector2();

  let width = 1;
  let cardBottom = 0.45; // fraction of the stage height where the statement card ends
  const HALF_H = Math.tan((34 / 2) * (Math.PI / 180)) * 9.5; // half the visible height at z = 0 (world units)
  const TV_H = 3.0 * 0.62; // TV height × its build scale, world units
  return {
    /** Conversation beat → what's on the tube (0 no signal, 1 brand-blue broadcast). */
    setChannel(ch) {
      screen.paint(ch);
    },
    /** CRT power (true plays the turn-on animation). */
    power(on) {
      screen.power(on);
    },
    /** Advance the live screen; true when the canvas needs a redraw. */
    tick(now) {
      return screen.tick(now);
    },
    dirty() {
      const d = needsDraw;
      needsDraw = false;
      return d;
    },
    setLayout(bottom) {
      cardBottom = Math.min(0.75, Math.max(0.2, bottom));
      needsDraw = true;
    },
    resize(w, h) {
      needsDraw = true;
      width = w;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(bufferSize);
      target.setSize(bufferSize.x, bufferSize.y);
      maskMaterial.uniforms.u_resolution.value.set(w, h);
    },
    render({ p, t, enter, px = 0, py = 0 }) {
      // Scroll: turns from a three-quarter view to face you as "how we help" arrives, with a slow
      // sway; + mouse tilt toward the cursor. Settles in the free band below the statement card.
      const face = smooth(0.12, 0.48, p);
      group.rotation.set(
        0.06 + Math.sin(p * Math.PI) * 0.08 + py * 0.36,
        lerp(-0.62, -0.04, face) + Math.sin(p * Math.PI * 3) * 0.04 + px * 0.7,
        Math.sin(p * Math.PI * 2) * 0.02 - px * 0.05,
      );
      const top = cardBottom + 0.04, bottom = 0.93;
      const centreY = (0.5 - (top + bottom) / 2) * 2 * HALF_H;
      const fit = (((bottom - top) * 2 * HALF_H) * 0.8) / TV_H;
      const widthCap = width < 768 ? 0.72 : width < 992 ? 0.85 : 1;
      group.scale.setScalar(lerp(width < 768 ? 0.7 : 1.15, Math.min(fit, widthCap), enter));
      group.position.x = width >= 768 ? lerp(width < 992 ? 1.5 : 1.35, 0, enter) : 0;
      group.position.y = lerp(width < 768 ? -0.4 : 0, centreY, enter);

      if (t > 0) {
        maskMaterial.uniforms.u_bottomProgress.value = t;
        renderer.setRenderTarget(target);
        renderer.setClearColor(white, 0); // transparent: the dissolve shader paints the grid there
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.setClearColor(blue, 0);
        renderer.clear();
        renderer.render(maskScene, maskCamera);
      } else {
        renderer.setRenderTarget(null);
        renderer.setClearColor(white, 0); // transparent: the stage's line grid shows around the TV
        renderer.clear();
        renderer.render(scene, camera);
      }
    },
  };
}
