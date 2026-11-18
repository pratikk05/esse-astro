// Tile-by-tile wipe between two service renders (after the Dgrees capture, app.min.js 7062-7076, 7287-7338).
// One full-frame quad: the shader finds each fragment's 10px tile and runs the original per-row timing,
// so the transition is identical to the old per-tile meshes at a single draw call.
export const FLIP_EXPANSE = 0.02;
export const clamp = (v) => Math.max(0, Math.min(1, v));

/** Scroll-progress window [start, end] of each of the count-1 transitions. */
export function gridLimits(width, height, count = 5) {
  const r = (0.5 * (height - width)) / height, s = 1 / (count - 1);
  return Array.from({ length: count - 1 }, (_, i) => [i * s + r * s, i * s + (1 - r) * s]);
}

/** Which two services are mid-transition at `progress` (0…1 over the list). */
export function transition(progress, limits) {
  const last = limits.length;
  if (progress >= 1) return { from: last, to: last, limit: limits[last - 1], done: true };
  const section = Math.min(last - 1, Math.floor(clamp(progress) * last));
  return { from: section, to: section + 1, limit: limits[section], done: false };
}

export const vertexShader = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const wipeFragment = /* glsl */ `precision highp float;
uniform sampler2D u_from; uniform sampler2D u_to;
uniform float u_progress; uniform vec2 u_limit; uniform vec2 u_grid; uniform float u_done;
varying vec2 vUv;
void main(){
  vec2 cell = floor(vUv * u_grid), local = fract(vUv * u_grid);
  float row = u_grid.y - 1.0 - cell.y;                                  // 0 = top row
  float centre = u_limit.x + (u_limit.y - u_limit.x) * (u_grid.y - row) / u_grid.y;
  float p = u_done > 0.5 ? 1.0 : clamp((u_progress - (centre - ${FLIP_EXPANSE.toFixed(2)})) / ${(2 * FLIP_EXPANSE).toFixed(2)}, 0.0, 1.0);
  float edge = p * 1.1 - 0.05;                                          // verticalColorWipe threshold
  gl_FragColor = local.y < edge ? texture2D(u_to, vUv) : texture2D(u_from, vUv);
  #include <colorspace_fragment>
}`;
