// Bayer-dithered fbm pixel background with click ripples (ported from Slater).
// One shader, shared by every `.bayer-dither-bg` (Process, Stats, CTA).
// Attributes: data-shape (square|circle|triangle|diamond), data-pixel-size, data-ink, data-ripples="1".
import { Clock, Color, Mesh, OrthographicCamera, PlaneGeometry, RawShaderMaterial, Scene, Vector2, WebGLRenderer } from "three";
import fragmentShader from "./pixel-background.frag";
import { inkOf, reducedMotion, watchVisibility } from "../lib/particles.js";

const SHAPES = { square: 0, circle: 1, triangle: 2, diamond: 3 };
const MAX_RIPPLES = 10;

const vertexShader = /* glsl */ `
  attribute vec3 position;
  void main() { gl_Position = vec4(position, 1.0); }
`;


function initBayer(el) {
  if (el.dataset.bayerInit) return;
  el.dataset.bayerInit = "1";

  const canvas = document.createElement("canvas");
  el.appendChild(canvas);

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
  } catch {
    return;
  }

  const uniforms = {
    uResolution: { value: new Vector2() },
    uTime: { value: 0 },
    uColor: { value: new Color(inkOf(el, "#ffffff")) },
    uPixelSize: { value: parseFloat(el.dataset.pixelSize) || 4 },
    uShapeType: { value: SHAPES[el.dataset.shape] ?? 0 },
    uClickPos: { value: Array.from({ length: MAX_RIPPLES }, () => new Vector2(-1, -1)) },
    uClickTime: { value: new Array(MAX_RIPPLES).fill(0) },
  };

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new Mesh(
    new PlaneGeometry(2, 2),
    new RawShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true })
  ));

  const resize = () => {
    const { width, height } = el.getBoundingClientRect();
    const w = Math.round(width) || 800;
    const h = Math.round(height) || 400;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
    renderer.render(scene, camera); // resizing clears the canvas
  };
  window.addEventListener("resize", resize);
  resize();

  if (el.dataset.ripples === "1") {
    let next = 0;
    (el.parentNode || el).addEventListener("pointerdown", (e) => {
      const rect = canvas.getBoundingClientRect();
      uniforms.uClickPos.value[next].set(
        (e.clientX - rect.left) * (canvas.width / rect.width),
        (rect.height - (e.clientY - rect.top)) * (canvas.height / rect.height)
      );
      uniforms.uClickTime.value[next] = uniforms.uTime.value;
      next = (next + 1) % MAX_RIPPLES;
    });
  }

  // Only draw while on screen (the loop fully sleeps otherwise); reduced motion keeps the first static frame.
  const clock = new Clock();
  let visible = false;
  let raf = 0;
  const loop = () => {
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    raf = visible && !reducedMotion.matches ? requestAnimationFrame(loop) : 0;
  };
  watchVisibility(el, (v) => {
    visible = v;
    if (v && !raf) raf = requestAnimationFrame(loop);
  });
  renderer.render(scene, camera);
}

const init = () => document.querySelectorAll(".bayer-dither-bg").forEach(initBayer);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
