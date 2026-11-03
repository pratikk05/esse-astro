// Pixel-mask dissolve (About → Stats). Draws the rendered sculpture scene (u_input)
// through a noisy 4×4 block pattern that eats the surface away as u_bottomProgress goes 0 → 1.
precision highp float;

in vec2 v_uv;
uniform sampler2D u_input;
uniform float u_topProgress;
uniform float u_bottomProgress;
uniform vec2 u_resolution;
uniform float u_pixel_size;
out vec4 FragColor;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
  return res * res;
}

float checkEqual(float a, float b) {
  return 1.0 - ceil(abs(a - b) / 20.0);
}

// 16 sub-blocks per cell switch on in a fixed order as opacity rises.
float blockPattern(vec2 rect, float opacity, float inverted) {
  float x = mod(round(mod(rect.x, 1.0) * 4.0 + 1.5), 4.0);
  float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5), 4.0);

  float progress = 1.0 / 16.0;
  float invertedOffset = 16.0 * inverted;
  float threshold = 1.0 - opacity;

  // (x, y) of each block, in reveal order
  vec2 order[16] = vec2[16](
    vec2(0, 0), vec2(0, 2), vec2(2, 1), vec2(3, 3), vec2(1, 3), vec2(0, 1), vec2(2, 0), vec2(0, 3),
    vec2(1, 2), vec2(3, 2), vec2(3, 0), vec2(2, 3), vec2(2, 2), vec2(1, 0), vec2(1, 1), vec2(3, 1)
  );

  float result = 0.0;
  for (int i = 0; i < 16; i++) {
    float on = step(threshold, progress * abs(invertedOffset - float(i)));
    result += on * checkEqual(order[i].x, x) * checkEqual(order[i].y, y);
  }
  return min(1.0, result) * ceil(opacity);
}

vec3 linearToSRGB(vec3 c) {
  return mix(12.92 * c, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  float gap = 0.2;
  float strength = 0.15;
  vec2 uv = v_uv;

  float columns = u_resolution.x / u_pixel_size;
  float rows = u_resolution.y / u_pixel_size;

  vec2 roundedUV = vec2(
    (round(uv.x * columns * 4.0 - 0.5) + 0.5) / columns / 4.0,
    (round(uv.y * rows * 4.0 - 0.5) + 0.5) / rows / 4.0
  );
  float n = 0.5 * noise(roundedUV * 8.0);
  roundedUV.y = roundedUV.y * (1.0 - strength * 2.0) + strength + strength * n;

  float inverse = step(0.5, uv.y - u_bottomProgress);
  float edge = roundedUV.y * (1.0 - gap);
  float opacity = smoothstep(edge - gap, edge, u_topProgress - gap)
                - smoothstep(edge - gap, edge, u_bottomProgress - gap);

  float alpha = blockPattern(vec2(uv.x * columns, uv.y * rows), opacity, inverse);
  FragColor = vec4(linearToSRGB(texture(u_input, uv).rgb), alpha);
}
