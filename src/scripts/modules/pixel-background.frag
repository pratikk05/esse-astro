// Bayer-dithered fbm noise + click ripples. Used by pixel-background.js.
precision highp float;
#define MAX_RIPPLES 10  // keep in sync with MAX_RIPPLES in pixel-background.js

uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uShapeType;
uniform vec2 uClickPos[MAX_RIPPLES];
uniform float uClickTime[MAX_RIPPLES];

float hash11(float n) { return fract(sin(n) * 43758.5453); }

float vnoise(vec3 p) {
  const vec3 K = vec3(1.0, 57.0, 113.0);
  vec3 ip = floor(p), fp = fract(p);
  float n000 = hash11(dot(ip, K));
  float n100 = hash11(dot(ip + vec3(1, 0, 0), K));
  float n010 = hash11(dot(ip + vec3(0, 1, 0), K));
  float n110 = hash11(dot(ip + vec3(1, 1, 0), K));
  float n001 = hash11(dot(ip + vec3(0, 0, 1), K));
  float n101 = hash11(dot(ip + vec3(1, 0, 1), K));
  float n011 = hash11(dot(ip + vec3(0, 1, 1), K));
  float n111 = hash11(dot(ip + vec3(1, 1, 1), K));
  vec3 w = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y),
    mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y),
    w.z) * 2.0 - 1.0;
}

float fbm(vec2 uv, float t) {
  vec3 p = vec3(uv * 4.0, t);
  float s = 1.0 + vnoise(p) + vnoise(p * 1.25) + vnoise(p * 1.5625)
          + vnoise(p * 1.953125) + vnoise(p * 2.44140625);
  return s * 0.5 + 0.5;
}

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer8(vec2 a) { return (bayer2(0.25 * a) * 0.25 + bayer2(0.5 * a)) * 0.25 + bayer2(a); }

float ripple(vec2 uv, vec2 pos, float clickT, float ar, float cpx) {
  if (pos.x < 0.0) return 0.0;
  vec2 cuv = ((pos - uResolution * 0.5 - cpx * 0.5) / uResolution) * vec2(ar, 1.0);
  float t = max(uTime - clickT, 0.0);
  float r = distance(uv, cuv);
  float ring = exp(-pow((r - 0.3 * t) / 0.1, 2.0));
  return ring * exp(-t) * exp(-10.0 * r);
}

void main() {
  float px = uPixelSize;
  vec2 fc = gl_FragCoord.xy - uResolution * 0.5;
  float ar = uResolution.x / uResolution.y;
  vec2 pid = floor(fc / px);
  vec2 puv = fract(fc / px);

  float cpx = 8.0 * px;
  vec2 uv = floor(fc / cpx) * cpx / uResolution * vec2(ar, 1.0);

  float feed = fbm(uv, uTime * 0.05) * 0.5 - 0.65;
  for (int i = 0; i < MAX_RIPPLES; i++) {
    feed = max(feed, ripple(uv, uClickPos[i], uClickTime[i], ar, cpx));
  }

  float bw = step(0.5, feed + bayer8(fc / px) - 0.5);
  float rad = sqrt(bw);

  // circle
  float Mc = bw * step(length(puv - 0.5) - rad * 0.25, 0.0);
  // triangle (alternating orientation)
  float fl = step(0.5, mod(pid.x + pid.y, 2.0));
  vec2 tp = vec2(mix(puv.x, 1.0 - puv.x, fl), puv.y);
  float Mt = bw * step(tp.y - rad * (1.0 - tp.x), 0.0);
  // diamond
  float Md = bw * step(abs(puv.x - 0.49) + abs(puv.y - 0.49), rad * 0.564);

  float M = uShapeType < 0.5 ? bw : uShapeType < 1.5 ? Mc : uShapeType < 2.5 ? Mt : Md;
  gl_FragColor = vec4(uColor, M);
}
