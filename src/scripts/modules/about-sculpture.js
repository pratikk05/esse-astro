// Dithered helmet + pixel-dissolve pass for the About scene. Loaded on demand by about-scene.js,
// so Three.js is only downloaded when the visitor scrolls near About.
//
// A plain-Three.js port of niccolofanton/dithering-shader (MIT) — same look, none of its runtime
// (no React / R3F / drei / postprocessing):
//   1. Environment: the demo's "Room" (grey box room, white blocks, soft box light-formers and the
//      #066aff ring highlight, after @0xca0a) is rendered ONCE into a cube map → PMREM → env map.
//   2. The helmet: MeshStandardMaterial, roughness 0.15, env intensity 1.5 — rendered to a half-float target.
//   3. The demo's dithering pass, verbatim: pixelate (grid 4, ratio 1), luminance r+g+b, 4×4 Bayer
//      threshold, colour mode (grayscale off) → black or the lit colour.
//
// Model: "Jousting Helmet" by The Royal Armoury (Livrustkammaren), CC-BY-4.0
// https://sketchfab.com/3d-models/jousting-helmet-a4eea31d9d9441af9434a7da5ae46b54
// Packed to /models/helmet.bin (~190KB: 20k tris, int16 positions, normals rebuilt here).
// Motion: driven by scroll progress only; the canvas redraws only when the scroll state changes.
import {
  BackSide, BoxGeometry, BufferAttribute, BufferGeometry, Color, CubeCamera, DoubleSide, GLSL3, Group,
  HalfFloatType, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, OrthographicCamera,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, RGBAFormat, RingGeometry, Scene, ShaderMaterial,
  SpotLight, Vector2, WebGLCubeRenderTarget, WebGLRenderTarget, WebGLRenderer,
} from "three";
import dissolveFragment from "./about-dissolve.frag";

const PIXEL_SIZE = 12; // dissolve box size (CSS px) — one box of the stage line grid
const DITHER = { gridSize: 4, pixelSizeRatio: 1, grayscaleOnly: 0, invertColor: 0 }; // demo settings
const ENV = { intensity: 1.5, highlight: "#066aff" }; // demo settings
const lerp = (a, b, t) => a + (b - a) * t;

async function loadHelmet() {
  const buf = await (await fetch("/models/helmet.bin")).arrayBuffer();
  const h = new DataView(buf);
  const vc = h.getUint32(0, true), ic = h.getUint32(4, true);
  const min = [0, 1, 2].map((k) => h.getFloat32(8 + k * 4, true));
  const size = [0, 1, 2].map((k) => h.getFloat32(20 + k * 4, true));
  const q = new Uint16Array(buf, 32, vc * 3);
  const posBytes = 32 + (vc * 3 + ((vc * 3) % 2)) * 2;
  const index = vc > 65535 ? new Uint32Array(buf, posBytes, ic) : new Uint16Array(buf, posBytes, ic);
  // Dequantise, centre and normalise to a height of 2.8 units
  const pos = new Float32Array(vc * 3);
  const s = 2.8 / Math.max(...size);
  for (let i = 0; i < vc * 3; i++) {
    const k = i % 3;
    pos[i] = ((q[i] / 65535) * size[k] + min[k] - (min[k] + size[k] / 2)) * s;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setIndex(new BufferAttribute(index, 1));
  geo.computeVertexNormals();
  return geo;
}

// The demo's Room (environment.tsx), rendered once into a cube map.
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

// DitheringShader.ts (niccolofanton/dithering-shader), unchanged maths; output converted to sRGB
// here because this is the last pass. Alpha is kept so the stage grid shows around the helmet.
const ditherFragment = /* glsl */ `
  precision highp float;
  in vec2 v_uv;
  uniform sampler2D inputBuffer;
  uniform vec2 resolution;
  uniform float gridSize;
  uniform float pixelSizeRatio;
  uniform float grayscaleOnly;
  uniform float invertColor;
  out vec4 FragColor;

  bool getValue(float brightness, vec2 pos) {
    if (brightness > 16.0 / 17.0) return false;
    if (brightness < 1.0 / 17.0) return true;
    vec2 pixel = floor(mod(pos.xy / gridSize, 4.0));
    int x = int(pixel.x);
    int y = int(pixel.y);
    if (x == 0) {
      if (y == 0) return brightness < 16.0 / 17.0;
      if (y == 1) return brightness < 5.0 / 17.0;
      if (y == 2) return brightness < 13.0 / 17.0;
      return brightness < 1.0 / 17.0;
    } else if (x == 1) {
      if (y == 0) return brightness < 8.0 / 17.0;
      if (y == 1) return brightness < 12.0 / 17.0;
      if (y == 2) return brightness < 4.0 / 17.0;
      return brightness < 9.0 / 17.0;
    } else if (x == 2) {
      if (y == 0) return brightness < 14.0 / 17.0;
      if (y == 1) return brightness < 2.0 / 17.0;
      if (y == 2) return brightness < 15.0 / 17.0;
      return brightness < 3.0 / 17.0;
    } else {
      if (y == 0) return brightness < 6.0 / 17.0;
      if (y == 1) return brightness < 10.0 / 17.0;
      if (y == 2) return brightness < 7.0 / 17.0;
      return brightness < 11.0 / 17.0;
    }
  }

  vec3 linearToSRGB(vec3 c) {
    return mix(12.92 * c, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }

  void main() {
    vec2 uv = v_uv;
    vec2 fragCoord = uv * resolution;
    float pixelSize = gridSize * pixelSizeRatio;
    vec2 pixelatedUV = floor(fragCoord / pixelSize) * pixelSize / resolution;
    vec4 sampled = texture(inputBuffer, pixelatedUV);
    vec3 baseColor = sampled.rgb;
    float luminance = dot(baseColor, vec3(1.0));
    if (grayscaleOnly > 0.0) baseColor = vec3(luminance);
    bool dithered = getValue(luminance, fragCoord);
    baseColor = dithered ? vec3(0.0) : baseColor;
    if (invertColor > 0.0) baseColor = 1.0 - baseColor;
    FragColor = vec4(linearToSRGB(clamp(baseColor, 0.0, 1.0)), sampled.a);
  }
`;

const quadVertex = "out vec2 v_uv; void main() { v_uv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

export function createSculpture(canvas, token) {
  const white = new Color(token("--color-background"));
  const blue = new Color(token("--color-secondary"));

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new Scene();
  scene.environment = bakeEnvironment(renderer);
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.z = 9.5;

  // Model material in the demo: the helmet's steel material with roughness 0.15 (textures dropped here)
  const material = new MeshStandardMaterial({ color: 0x666b72, metalness: 1, roughness: 0.15, envMapIntensity: ENV.intensity });

  // Base pose from the reference demo (Center rotation), then scroll adds on top.
  const group = new Group();
  const pose = new Group();
  pose.rotation.set(0, -Math.PI / 3.5, -0.4);
  group.add(pose);
  scene.add(group);
  let needsDraw = true; // the scene only redraws on scroll, so flag load/resize for one extra frame
  loadHelmet()
    .then((geo) => {
      pose.add(new Mesh(geo, material));
      needsDraw = true;
    })
    .catch((e) => console.error("Helmet model failed to load", e));

  // Pass 1 → sceneTarget (linear, half float). Pass 2: dither → screen, or → ditherTarget when the
  // About→Stats dissolve is running (pass 3 masks it).
  const sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter });
  const ditherTarget = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter });
  const ditherMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      inputBuffer: { value: sceneTarget.texture },
      resolution: { value: new Vector2(1, 1) },
      gridSize: { value: DITHER.gridSize },
      pixelSizeRatio: { value: DITHER.pixelSizeRatio },
      grayscaleOnly: { value: DITHER.grayscaleOnly },
      invertColor: { value: DITHER.invertColor },
    },
    vertexShader: quadVertex,
    fragmentShader: ditherFragment,
  });
  const ditherScene = new Scene();
  ditherScene.add(new Mesh(new PlaneGeometry(2, 2), ditherMaterial));

  // Dissolve pass (About → Stats): the dithered frame drawn through the pixel mask
  const target = ditherTarget;
  const maskMaterial = new ShaderMaterial({
    glslVersion: GLSL3,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      u_input: { value: target.texture },
      u_topProgress: { value: 1 },
      u_bottomProgress: { value: -1 },
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
  return {
    dirty() {
      const d = needsDraw;
      needsDraw = false;
      return d;
    },
    resize(w, h) {
      needsDraw = true;
      width = w;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(bufferSize);
      sceneTarget.setSize(bufferSize.x, bufferSize.y);
      target.setSize(bufferSize.x, bufferSize.y);
      ditherMaterial.uniforms.resolution.value.copy(bufferSize);
      maskMaterial.uniforms.u_resolution.value.set(w, h);
    },
    render({ p, t, enter }) {
      // Scroll only: a slow 1.4 turn, a tilt that breathes with the scroll, and a settle into place
      // under the statement card as the story enters.
      group.rotation.set(0.12 + Math.sin(p * Math.PI) * 0.28, -0.35 + p * Math.PI * 2.8, Math.sin(p * Math.PI * 2) * 0.08);
      const size = width < 768 ? 0.62 : width < 992 ? 0.8 : 1;
      group.scale.setScalar(size * lerp(1.15, 0.86, enter));
      group.position.x = width >= 768 ? lerp(width < 992 ? 1.5 : 1.35, 0, enter) : 0;
      group.position.y = lerp(width < 768 ? -0.6 : 0, width < 768 ? -1.25 : -1.05, enter);

      renderer.setRenderTarget(sceneTarget);
      renderer.setClearColor(white, 0);
      renderer.clear();
      renderer.render(scene, camera);
      if (t > 0) {
        maskMaterial.uniforms.u_bottomProgress.value = t;
        renderer.setRenderTarget(target);
        renderer.setClearColor(white, 0); // transparent: the dissolve shader paints the grid there
        renderer.clear();
        renderer.render(ditherScene, maskCamera);
        renderer.setRenderTarget(null);
        renderer.setClearColor(blue, 0);
        renderer.clear();
        renderer.render(maskScene, maskCamera);
      } else {
        renderer.setRenderTarget(null);
        renderer.setClearColor(white, 0); // transparent: the stage's line grid shows around the helmet
        renderer.clear();
        renderer.render(ditherScene, maskCamera);
      }
    },
  };
}
