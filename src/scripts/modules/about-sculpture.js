// Three.js sculpture + pixel-dissolve pass for the About scene. Loaded on demand by about-scene.js,
// so Three.js is only downloaded when the visitor scrolls near About.
import { ACESFilmicToneMapping, CanvasTexture, Color, Curve, DirectionalLight, EquirectangularReflectionMapping, GLSL3, Group, HemisphereLight, LinearFilter, Mesh, MeshStandardMaterial, OrthographicCamera, PMREMGenerator, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, TubeGeometry, Vector2, Vector3, WebGLRenderTarget, WebGLRenderer, sRGBEncoding } from "three";
import dissolveFragment from "./about-dissolve.frag";

const PIXEL_SIZE = 8;
const lerp = (a, b, t) => a + (b - a) * t;

// Forty-four closed, swept ribs form a turbine-like toroidal sculpture, lit by a procedural softbox.
export function createSculpture(canvas, token) {
  const white = new Color(token("--color-background"));
  const blue = new Color(token("--color-secondary"));

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.z = 9.5;

  // Environment: grey room with four soft light panels
  const env = document.createElement("canvas");
  env.width = 2048;
  env.height = 1024;
  const ctx = env.getContext("2d");
  ctx.fillStyle = "#777b82";
  ctx.fillRect(0, 0, 2048, 1024);
  const softbox = (x, y, w, h, power) => {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const c = `rgb(${power},${power},${power})`;
    g.addColorStop(0, "#161821");
    g.addColorStop(0.18, c);
    g.addColorStop(0.8, c);
    g.addColorStop(1, "#161821");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  softbox(170, 100, 160, 770, 220);
  softbox(720, 30, 390, 330, 255);
  softbox(1370, 180, 100, 620, 165);
  softbox(1770, 460, 200, 330, 230);
  const envTex = new CanvasTexture(env);
  envTex.mapping = EquirectangularReflectionMapping;
  envTex.encoding = sRGBEncoding;
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  const chrome = new MeshStandardMaterial({ color: 0x858b94, metalness: 1, roughness: 0.2, envMapIntensity: 1.45 });
  const blueLinear = blue.clone().convertSRGBToLinear();
  const cobalt = new MeshStandardMaterial({ color: blueLinear, emissive: blueLinear, emissiveIntensity: 0.32, metalness: 0.28, roughness: 0.24, envMapIntensity: 1.1 });

  class Rib extends Curve {
    constructor(angle) {
      super();
      this.angle = angle;
    }
    getPoint(t, dest = new Vector3()) {
      const q = t * Math.PI * 2;
      const radial = 1.16 + 0.54 * Math.cos(q);
      const theta = this.angle + 0.26 * Math.sin(q) + 0.12 * Math.cos(q);
      return dest.set(radial * Math.cos(theta), radial * Math.sin(theta), 0.51 * Math.sin(q));
    }
  }

  const group = new Group();
  const SEGMENTS = 96;
  const RADIAL = 8;
  for (let i = 0; i < 44; i++) {
    const curve = new Rib((i / 44) * Math.PI * 2);
    const geo = new TubeGeometry(curve, SEGMENTS, 0.038, RADIAL, true);
    // Flatten the round tube into a thin blade
    const frames = curve.computeFrenetFrames(SEGMENTS, true);
    const pos = geo.attributes.position;
    for (let j = 0; j <= SEGMENTS; j++) {
      const center = curve.getPoint(j / SEGMENTS);
      for (let k = 0; k <= RADIAL; k++) {
        const a = (k / RADIAL) * Math.PI * 2;
        const v = center.clone().addScaledVector(frames.normals[j], -0.021 * Math.cos(a)).addScaledVector(frames.binormals[j], 0.061 * Math.sin(a));
        pos.setXYZ(j * (RADIAL + 1) + k, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    group.add(new Mesh(geo, i % 11 < 4 ? cobalt : chrome));
  }
  scene.add(group);

  scene.add(new HemisphereLight(0xffffff, 0x050505, 0.18));
  const key = new DirectionalLight(0xffffff, 2);
  key.position.set(-3, 4, 5);
  const rim = new DirectionalLight(0xcbd3df, 0.7);
  rim.position.set(4, -2, 0);
  scene.add(key, rim);

  // Dissolve pass: render the scene to a texture, then draw it through the pixel mask
  const target = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter });
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
    vertexShader: "out vec2 v_uv; void main() { v_uv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: dissolveFragment,
  });
  const maskScene = new Scene();
  maskScene.add(new Mesh(new PlaneGeometry(2, 2), maskMaterial));
  const maskCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bufferSize = new Vector2();

  let width = 1;
  return {
    resize(w, h) {
      width = w;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(bufferSize);
      target.setSize(bufferSize.x, bufferSize.y);
      maskMaterial.uniforms.u_resolution.value.set(w, h);
    },
    render({ p, t, enter, time, px, py }) {
      group.rotation.set(
        0.12 + Math.sin(time) * 0.09 + Math.sin(p * Math.PI * 2) * 0.75 + py * 0.13,
        -0.18 + p * Math.PI * 1.85 + px * 0.16,
        time + p * 1.5,
      );
      // Starts large and off to the right, settles centred and smaller as the statement enters
      const size = width < 768 ? 0.48 : width < 992 ? 0.65 : 0.9;
      group.scale.setScalar(size * lerp(1.03, 0.64, enter));
      group.position.x = width >= 768 ? lerp(width < 992 ? 1.5 : 1.35, 0, enter) : 0;
      group.position.y = lerp(width < 768 ? -1 : 0, 0, enter);

      if (t > 0) {
        maskMaterial.uniforms.u_bottomProgress.value = t;
        renderer.setRenderTarget(target);
        renderer.setClearColor(white, 1);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.setClearColor(blue, 0);
        renderer.render(maskScene, maskCamera);
      } else {
        renderer.setRenderTarget(null);
        renderer.setClearColor(white, 1);
        renderer.render(scene, camera);
      }
    },
  };
}
