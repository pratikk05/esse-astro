// Pixel-mask dissolve (About → Stats), "box filling" — the same move as the CTA reveal
// (cta-dissolve.js): the About stage is cut into the 12px boxes of its line grid; as u_bottomProgress
// goes 0 → 1 a wavy front rises from the bottom, and inside each box a blue square appears (Bayer
// order), grows and merges with its neighbours until the screen is solid Stats blue.
// Alpha 1 = the About stage (TV + grid), alpha 0 = see-through to <Stats /> underneath.
precision highp float;

in vec2 v_uv;
uniform sampler2D u_input;
uniform float u_bottomProgress;
uniform vec2 u_resolution; // CSS px
uniform float u_pixel_size; // grid box size, CSS px (12 — matches the stage grid)
out vec4 FragColor;

float rand(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}
// Smooth 1D value noise for the wavy front (same shape as the CTA reveal)
float wave(float x) {
  float i = floor(x), f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(rand(i), rand(i + 1.0), u);
}

float bayer(vec2 cell) {
  int i = int(mod(cell.x, 4.0)) + int(mod(cell.y, 4.0)) * 4;
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[i] + 0.5) / 16.0;
}

void main() {
  vec2 css = vec2(v_uv.x, 1.0 - v_uv.y) * u_resolution; // top-left origin, like the CSS grid
  vec2 cell = floor(css / u_pixel_size);
  vec2 local = fract(css / u_pixel_size);
  float rows = u_resolution.y / u_pixel_size;

  // Rising front: 0 at the bottom edge, 1 at the top
  float fromBottom = 1.0 - (cell.y + 0.5) / rows;
  float bump = wave(cell.x * 0.045) * 0.28 + wave(cell.x * 0.13 + 9.0) * 0.1;
  float front = u_bottomProgress * 2.0 - 0.3;
  float density = clamp((front - fromBottom - bump + 0.15) * 3.0, 0.0, 1.0);

  // Blue square inside this box: appears in Bayer order, grows from 3px to the full box
  bool blue = false;
  if (density > bayer(cell)) {
    float grow = clamp((density - 0.5) / 0.45, 0.0, 1.0);
    float size = grow >= 1.0 ? 1.01 : (3.0 + (u_pixel_size - 3.0) * grow * grow) / u_pixel_size;
    vec2 d = abs(local - 0.5);
    blue = max(d.x, d.y) <= size * 0.5;
  }

  // The TV is drawn in final (sRGB) colours; transparent texels are the stage, so paint its
  // 12px line grid there (same as .about-grid / .section-pixel) to keep the surface seamless.
  vec4 src = texture(u_input, v_uv);
  float line = step(mod(css.x, 12.0), 1.0) + step(mod(css.y, 12.0), 1.0);
  vec3 stage = mix(vec3(1.0), vec3(0.9686, 0.9725, 0.9725), min(line, 1.0));
  FragColor = vec4(mix(stage, src.rgb, src.a), blue ? 0.0 : 1.0);
}
