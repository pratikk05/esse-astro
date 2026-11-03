// Liquid gradient background for the Hero (raw WebGL2, no Three.js; it's above the fold, so it stays light).
// Palette: optional data-colors="rgb(...), rgb(...), …" on the canvas (up to 8), otherwise the defaults below.
// Draws only while the hero is on screen; reduced motion shows a single still frame.
import fragment from "./hero-gradient.frag";
import { reducedMotion, watchVisibility } from "../lib/particles.js";

const DEFAULT_COLORS = ["rgb(0, 0, 26)", "rgb(0, 67, 250)", "rgb(0, 221, 255)", "rgb(0, 94, 255)", "rgb(0, 255, 255)"];

const vertex = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

function initHeroGradient(canvas) {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
    console.error(gl.getShaderInfoLog(sh));
    return null;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return console.error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  // Fullscreen quad
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const loc = (n) => gl.getUniformLocation(program, n);
  const uResolution = loc("u_resolution");
  const uTime = loc("u_time");
  const uPixelRatio = loc("u_pixelRatio");

  // Palette is static: upload once.
  const colors = (canvas.dataset.colors?.match(/rgb\([^)]+\)/g) || DEFAULT_COLORS).slice(0, 8);
  gl.uniform3fv(loc("u_colors[0]"), new Float32Array(colors.flatMap((c) => c.match(/\d+/g).slice(0, 3).map((n) => n / 255))));
  gl.uniform1i(loc("u_colors_length"), colors.length);

  const start = performance.now();
  let raf = 0;
  let visible = true;
  const draw = (now) => {
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uResolution, w, h);
    gl.uniform1f(uPixelRatio, dpr);
    if (!raf) draw(performance.now()); // resizing clears the canvas; repaint when paused
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const loop = (now) => {
    draw(now);
    raf = visible && !reducedMotion.matches ? requestAnimationFrame(loop) : 0;
  };
  const play = () => { if (!raf) raf = requestAnimationFrame(loop); };

  watchVisibility(canvas, (v) => { visible = v; if (v) play(); }, "0px");
  reducedMotion.addEventListener("change", play);
  play();
}

document.querySelectorAll("#liquid-gradient-canvas, [data-liquid-gradient]").forEach(initHeroGradient);
