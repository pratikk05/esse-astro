#version 300 es
// Liquid gradient (Hero). Turbulent wave field → OKLCH palette ramp → light dither.
// The tuning values below were uniforms set to the same numbers every frame; they are constants now.
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pixelRatio;
uniform vec3 u_colors[8];
uniform int u_colors_length;

const float CONTRAST = 1.1;
const float DITHER = 0.1;
const float EXPOSURE = 0.9; // was 1.1; lower = less white in the bright areas
const float SATURATION = 1.0;
const float SCALE = 0.1;
const float SEED = 689.0;
const float SPEED = 0.55; // original 0.14; raise for faster flow, lower for calmer
const float TURB_AMP = 0.6;
const float TURB_FREQ = 0.1;
const int TURB_ITER = 7;
const float WAVE_FREQ = 3.8;

const float GOLDEN_ANGLE = 2.3999632;
const float TAU = 6.28318530;

uvec3 hash3(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}

vec3 seedRandom(float s) {
  uvec3 u = uvec3(floatBitsToUint(s), floatBitsToUint(s * 1.5 + 7.31), floatBitsToUint(s * 2.7 + 13.37));
  return vec3(hash3(u)) / float(0xFFFFFFFFu);
}

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(0.4545)); }

vec3 linearToOklab(vec3 c) {
  float l = pow(max(.4122214708 * c.r + .5363325363 * c.g + .0514459929 * c.b, 0.0), 1.0 / 3.0);
  float m = pow(max(.2119034982 * c.r + .6806995451 * c.g + .1073969566 * c.b, 0.0), 1.0 / 3.0);
  float s = pow(max(.0883024619 * c.r + .2817188376 * c.g + .6299787005 * c.b, 0.0), 1.0 / 3.0);
  return vec3(
    .2104542553 * l + .7936177850 * m - .0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .8086757660 * s);
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + .3963377774 * c.y + .2158037573 * c.z;
  float m = c.x - .1055613458 * c.y - .0638541728 * c.z;
  float s = c.x - .0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115911 * m + .2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.7076147010 * s);
}

// Interpolate two OKLab colours through LCH (shortest hue path).
vec3 mixLch(vec3 lab0, vec3 lab1, float t) {
  vec3 a = vec3(lab0.x, length(lab0.yz), atan(lab0.z, lab0.y));
  vec3 b = vec3(lab1.x, length(lab1.yz), atan(lab1.z, lab1.y));
  if (a.y < .05) a.z = b.z;
  if (b.y < .05) b.z = a.z;
  float dh = b.z - a.z;
  if (dh > 3.14159265) dh -= TAU;
  if (dh < -3.14159265) dh += TAU;
  vec3 lch = vec3(mix(a.x, b.x, t), mix(a.y, b.y, t), a.z + dh * t);
  return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}

vec3 getColor(int i) { return u_colors[clamp(i, 0, u_colors_length - 1)]; }

vec3 palette(float t, int count) {
  if (count < 2) return toLinear(getColor(0));
  float seg = 1.0 / float(count - 1);
  t = clamp(t, 0.0, 1.0);
  int i = min(int(floor(t / seg)), count - 2);
  float lt = clamp((t - float(i) * seg) / seg, 0.0, 1.0);
  return oklabToLinear(mixLch(linearToOklab(toLinear(getColor(i))), linearToOklab(toLinear(getColor(i + 1))), lt));
}

// Interleaved gradient noise
float IGN(vec2 uv) { return fract(52.9829189 * fract(dot(uv, vec2(.06711056, .00583715)))); }

vec3 softGamutMap(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  if (minC >= 0.0 && maxC <= 1.0) return c;
  vec3 lab = linearToOklab(max(c, 0.0));
  float L = clamp(lab.x, 0.0, 1.0);
  float C = length(lab.yz);
  float h = atan(lab.z, lab.y);
  float maxChroma = .4 * (1.0 - pow(abs(2.0 * L - 1.0), 2.0));
  float knee = maxChroma * .7;
  if (C > knee) C = knee + (maxChroma - knee) * tanh((C - knee) / (maxChroma - knee + .001));
  return clamp(oklabToLinear(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
}

vec3 contrastSaturation(vec3 c) {
  vec3 lab = linearToOklab(c);
  float C = length(lab.yz) * SATURATION;
  float h = atan(lab.z, lab.y);
  lab.x = clamp((lab.x - .5) * CONTRAST + .5, 0.0, 1.0);
  return oklabToLinear(vec3(lab.x, C * cos(h), C * sin(h)));
}

void main() {
  if (u_colors_length < 1) { fragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  vec2 fragCoord = v_uv * u_resolution;
  vec2 p = (fragCoord * 2.0 - u_resolution) / u_resolution.y;

  vec3 seedOffset = seedRandom(SEED);
  vec3 seedOffset2 = seedRandom(SEED + 100.0);
  vec2 seedPhase = (seedOffset2.xy - .5) * TAU;
  float cs = cos(SEED * GOLDEN_ANGLE);
  float sn = sin(SEED * GOLDEN_ANGLE);
  p = mat2(cs, -sn, sn, cs) * p;

  float t1 = u_time * .3 * SPEED;
  float freq = 1.0 / TURB_FREQ;
  float totalVal = 0.0;
  float totalWeight = 0.0;

  for (float i = 0.0; i < 4.0; i++) {
    float eph = i / 4.0;
    vec2 q = p * SCALE;
    float a = seedPhase.x;
    float d = seedPhase.y;
    for (int j = 2; j < TURB_ITER; j++) {
      float fj = float(j);
      q += TURB_AMP * sin(q.yx / freq * fj + t1 + vec2(a, d) + seedOffset.xy * fj) / fj;
      a += cos(fj + d * 1.2 + q.x * 2.0 - t1 + seedOffset2.z);
      d += sin(fj * q.y + a + seedOffset.z + t1 + seedOffset2.y);
    }
    float v = .5 + .5 * sin(length(q.yx + vec2(a, d) * .2) * WAVE_FREQ + i * i + seedOffset.x);
    float w = smoothstep(0.0, .5, eph) * smoothstep(1.0, .5, eph);
    totalVal += v * w;
    totalWeight += w;
  }

  float val = clamp((totalVal / totalWeight - .3) / .4, 0.0, 1.0);
  float dither = IGN(floor(fragCoord / u_pixelRatio));
  val = clamp(val + (dither - .5) * DITHER, 0.0, 1.0);

  vec3 col = palette(val, u_colors_length) * EXPOSURE;
  col = toSrgb(softGamutMap(contrastSaturation(col)));
  fragColor = vec4(col, 1.0);
}
