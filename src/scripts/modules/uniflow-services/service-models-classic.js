// CLASSIC set (panels, cube, torus knot, magnifier, gears) — kept for undo. To switch back, import
// createServiceModels from "./service-models-classic.js" in index.js, restore the old alt texts, and copy
// public/uniflow/img/service-<key>-classic.webp back over service-<key>.webp (the still fallbacks).
// Five studio-lit 3D models, one per service, each rendered live into its own render target.
// The services shader wipes between those targets tile by tile as the list scrolls.
// Monochrome studio palette (ceramic white, satin black, chrome) with one electric-blue accent each.
//   website   — floating stack of UI panels (header, blue hero, cards)
//   design    — a cube, half wireframe with blue Bézier handles, half solid (design → build)
//   immersive — glossy torus knot with an orbiting blue sphere
//   search    — magnifying glass with orbiting "AI" sparks
//   support   — two interlocking gears turning together

import { createStudioEnv } from "../../lib/studio-env.js";

const BLUE = 0x2929fd;

export function createServiceModels(THREE, renderer) {
  renderer.localClippingEnabled = true; // the "design" cube is cut in half

  // ---- shared studio lighting (scripts/lib/studio-env.js) ----
  const envMap = createStudioEnv(THREE, renderer);

  const mat = {
    ceramic: () => new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    satin: () => new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.42, metalness: 0.2 }),
    chrome: () => new THREE.MeshStandardMaterial({ color: 0xd9dadc, roughness: 0.12, metalness: 1 }),
    blue: () => new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  };
  const roundedSlab = (w, h, d, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.35, bevelSize: Math.min(r, d) * 0.5, bevelSegments: 4, curveSegments: 8 });
    g.translate(0, 0, -d / 2);
    return g;
  };
  const gearGeometry = (radius, teeth, depth) => {
    const s = new THREE.Shape(), inner = radius, outer = radius * 1.18, step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      const pts = [[inner, a], [outer, a + step * 0.18], [outer, a + step * 0.5], [inner, a + step * 0.68]];
      pts.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo : s.lineTo).call(s, Math.cos(t) * r, Math.sin(t) * r));
    }
    s.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, radius * 0.32, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 24 });
    g.translate(0, 0, -depth / 2);
    return g;
  };

  // ---- one scene per service; `tick(t)` animates it ----
  const builders = {
    website() {
      const g = new THREE.Group();
      const layers = [];
      for (let i = 0; i < 3; i++) {
        const panel = new THREE.Mesh(roundedSlab(2.1, 1.45, 0.05, 0.1), i === 2 ? mat.ceramic() : mat.satin());
        panel.position.set(-0.18 * (2 - i), -0.14 * (2 - i), -0.36 * (2 - i));
        g.add(panel); layers.push(panel);
      }
      const top = layers[2];
      const add = (geo, m, x, y) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, 0.07); top.add(o); return o; };
      add(roundedSlab(1.8, 0.1, 0.03, 0.04), mat.satin(), 0, 0.56);       // header
      add(roundedSlab(1.8, 0.62, 0.05, 0.06), mat.blue(), 0, 0.08);        // hero
      [-0.62, 0, 0.62].forEach((x) => add(roundedSlab(0.54, 0.34, 0.04, 0.05), mat.satin(), x, -0.48)); // cards
      g.rotation.set(-0.42, 0.55, 0.12); g.position.x = 0.15;
      return { object: g, tick: (t) => { g.rotation.y = 0.55 + Math.sin(t * 0.45) * 0.22; layers.forEach((l, i) => (l.position.y = -0.14 * (2 - i) + Math.sin(t * 1.1 + i) * 0.035)); } };
    },
    design() {
      const g = new THREE.Group();
      const size = 1.45, box = new THREE.BoxGeometry(size, size, size, 1, 1, 1);
      const solid = new THREE.Mesh(box, new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.3, clearcoat: 0.6, clippingPlanes: [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)], clipShadows: true, side: THREE.DoubleSide }));
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshPhysicalMaterial({ color: 0xdcdcda, roughness: 0.5, side: THREE.DoubleSide })); cap.rotation.y = Math.PI / 2; // cut face
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x16171a }));
      g.add(solid, cap, edges);
      const h = size / 2, handle = new THREE.SphereGeometry(0.06, 20, 14);
      [[-h, h, h], [-h, -h, h], [-h, h, -h], [-h, -h, -h]].forEach(([x, y, z]) => { const s = new THREE.Mesh(handle, mat.blue()); s.position.set(x, y, z); g.add(s); });
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(-h, h, h), new THREE.Vector3(-h - 0.6, h + 0.5, h), new THREE.Vector3(-h - 0.7, -h + 0.2, h + 0.4), new THREE.Vector3(-h, -h, h));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 8), mat.blue()));
      g.rotation.set(0.42, -0.6, 0); g.position.x = 0.25;
      return { object: g, tick: (t) => { g.rotation.y = -0.6 + Math.sin(t * 0.4) * 0.35; g.position.y = Math.sin(t * 0.9) * 0.04; } };
    },
    immersive() {
      const g = new THREE.Group();
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.72, 0.24, 260, 40, 2, 3), new THREE.MeshPhysicalMaterial({ color: 0xe8e8ea, metalness: 0.9, roughness: 0.14, clearcoat: 1, iridescence: 0.35 }));
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 24), mat.blue());
      g.add(knot, orb);
      return { object: g, tick: (t) => { knot.rotation.set(t * 0.25, t * 0.35, 0); orb.position.set(Math.cos(t * 0.8) * 1.25, Math.sin(t * 1.3) * 0.35, Math.sin(t * 0.8) * 1.25); } };
    },
    search() {
      const g = new THREE.Group();
      const lens = new THREE.Group();
      lens.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 32, 96), mat.satin()));
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1 }));
      glass.rotation.x = Math.PI / 2; lens.add(glass);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 32), mat.satin());
      handle.position.set(0.72, -0.72, 0); handle.rotation.z = Math.PI / 4; lens.add(handle);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.14, 32), mat.chrome());
      collar.position.set(0.47, -0.47, 0); collar.rotation.z = Math.PI / 4; lens.add(collar);
      lens.position.set(-0.15, 0.15, 0); g.add(lens);
      const sparks = [0, 1, 2].map((i) => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 - i * 0.018), mat.blue()); g.add(s); return s; });
      g.rotation.set(0.2, -0.35, 0);
      return { object: g, tick: (t) => { lens.rotation.y = Math.sin(t * 0.5) * 0.35; sparks.forEach((s, i) => { const a = t * (0.7 + i * 0.25) + i * 2.1; s.position.set(-0.15 + Math.cos(a) * 0.95, 0.15 + Math.sin(a * 1.3) * 0.75, Math.sin(a) * 0.5); s.rotation.set(t, t * 1.3, 0); }); } };
    },
    support() {
      const g = new THREE.Group();
      const big = new THREE.Mesh(gearGeometry(0.62, 14, 0.24), mat.ceramic());
      const small = new THREE.Mesh(gearGeometry(0.38, 9, 0.24), mat.blue());
      big.position.set(-0.32, 0.12, 0); small.position.set(0.66, -0.42, 0.02);
      const hub = (r, x, y) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 32), mat.satin()); h.rotation.x = Math.PI / 2; h.position.set(x, y, 0); g.add(h); };
      hub(0.13, -0.32, 0.12); hub(0.09, 0.66, -0.42);
      g.add(big, small);
      g.rotation.set(-0.35, 0.5, 0);
      return { object: g, tick: (t) => { big.rotation.z = t * 0.35; small.rotation.z = -t * 0.35 * (14 / 9) + 0.17; g.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.15; } };
    },
  };

  const keys = Object.keys(builders);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 7.6);
  const scenes = keys.map((key) => {
    const scene = new THREE.Scene();
    scene.environment = envMap;
    const key_ = new THREE.DirectionalLight(0xffffff, 2.2); key_.position.set(-2, 3, 4);
    scene.add(key_, new THREE.HemisphereLight(0xffffff, 0x8a8c90, 0.6));
    const model = builders[key]();
    scene.add(model.object);
    return { key, scene, tick: model.tick };
  });
  const targets = keys.map(() => {
    const rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4, type: THREE.UnsignedByteType });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt;
  });

  return {
    keys,
    textures: targets.map((rt) => rt.texture),
    setSize(w, h) {
      targets.forEach((rt) => rt.setSize(w, h));
      camera.aspect = w / h;
      // keep the model's on-screen size steady on tall/wide frames
      camera.position.z = 7.6 * Math.max(1, 1 / camera.aspect);
      camera.updateProjectionMatrix();
    },
    /** Render the listed services (indices) at time t (seconds) into their targets. */
    render(indices, t) {
      const prev = renderer.getRenderTarget();
      const prevClear = renderer.getClearAlpha();
      renderer.setClearColor(0x000000, 0);
      for (const i of new Set(indices)) {
        scenes[i].tick(t);
        renderer.setRenderTarget(targets[i]);
        renderer.clear();
        renderer.render(scenes[i].scene, camera);
      }
      renderer.setRenderTarget(prev);
      renderer.setClearAlpha(prevClear);
    },
    dispose() {
      targets.forEach((rt) => rt.dispose());
      envMap.dispose();
      scenes.forEach(({ scene }) => scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => m.dispose()); }));
    },
  };
}
