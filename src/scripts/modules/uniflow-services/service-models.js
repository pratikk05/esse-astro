// Five studio-lit 3D models, one per service, each rendered live into its own render target.
// The services shader wipes between those targets tile by tile as the list scrolls.
// Design language: clay-like ceramic white, satin black, electric blue (+ a touch of brand teal),
// with the site's pixel motifs. Every model tells what the service actually does, on a loop:
//   website   — a browser window that builds itself block by block; a pixel cursor clicks its CTA
//   design    — a Figma-style frame (blue design layer + selection) that a scan line turns into the built component
//   immersive — a voxel planet with ripples running over it and an orbiting blue moon
//   search    — a search bar typing a query while your result climbs from #3 to #1 (AI sparkle)
//   support   — a performance dial whose ticks fill to 96 around a pixel lightning bolt
// Undo: the previous set lives in service-models-classic.js (swap the import in index.js).

import { createStudioEnv } from "../../lib/studio-env.js";

const BLUE = 0x2929fd;
const TEAL = 0x1bdbce;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const window01 = (p, a, b) => clamp01((p - a) / (b - a)); // 0 → 1 across [a, b]

export function createServiceModels(THREE, renderer) {
  renderer.localClippingEnabled = true; // the "design" frame is cut by its scan line

  // ---- shared studio lighting (scripts/lib/studio-env.js) ----
  const envMap = createStudioEnv(THREE, renderer);

  const mat = {
    ceramic: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2, ...o }),
    paper: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xdcdfe0, roughness: 0.45, clearcoat: 0.3, ...o }),
    satin: (o = {}) => new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.42, metalness: 0.2, ...o }),
    blue: (o = {}) => new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, ...o }),
    teal: (o = {}) => new THREE.MeshPhysicalMaterial({ color: TEAL, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, ...o }),
  };
  // Rounded-rectangle slab (UI block). `anchorLeft` puts the origin on its left edge (for "typing" growth).
  const roundedSlab = (w, h, d, r, anchorLeft = false) => {
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const bevel = Math.min(r, d) * 0.5;
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.35, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
    g.translate(anchorLeft ? w / 2 : 0, 0, -d / 2);
    return g;
  };
  // Pixel figure from a string pattern ("#" = cube), centred, cube size `s`
  const pixels = (rows, s, material, depth = s) => {
    const g = new THREE.Group(), box = new THREE.BoxGeometry(s * 0.92, s * 0.92, depth);
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== "#") return;
      const m = new THREE.Mesh(box, material);
      m.position.set((i - (w - 1) / 2) * s, ((h - 1) / 2 - j) * s, 0);
      g.add(m);
    }));
    return g;
  };
  // 4-point "AI" sparkle
  const sparkleGeometry = (r, depth) => {
    const s = new THREE.Shape(), inner = r * 0.28;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? inner : r;
      (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * rad, Math.sin(a) * rad);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: depth * 0.3, bevelSegments: 3 });
    g.translate(0, 0, -depth / 2);
    return g;
  };

  // ---- one scene per service; `tick(t)` animates it ----
  const builders = {
    // A browser window that builds itself: chrome first, then nav, hero, copy, CTA and cards drop in;
    // a pixel cursor glides over and clicks the CTA; the page lifts away and rebuilds.
    website() {
      const g = new THREE.Group();
      const win = new THREE.Mesh(roundedSlab(2.4, 1.72, 0.08, 0.12), mat.ceramic());
      g.add(win);
      const Z = 0.075; // front face of the window
      const put = (geo, m, x, y, z = Z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
      // window chrome (always there)
      const bar = put(roundedSlab(2.4, 0.2, 0.02, 0.1), mat.paper(), 0, 0.76, Z - 0.02);
      bar.scale.y = 1;
      [-1.04, -0.93, -0.82].forEach((x) => { const d = put(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 24), mat.satin(), x, 0.76, Z + 0.01); d.rotation.x = Math.PI / 2; });
      put(roundedSlab(1.1, 0.09, 0.02, 0.045), mat.ceramic(), 0.15, 0.76, Z + 0.005);
      // page blocks, in build order: [geometry, material, x, y]
      const spec = [
        [roundedSlab(0.14, 0.14, 0.04, 0.03), mat.blue(), -0.98, 0.5],                 // logo
        [roundedSlab(0.2, 0.06, 0.03, 0.03), mat.satin(), 0.42, 0.5],                   // nav
        [roundedSlab(0.2, 0.06, 0.03, 0.03), mat.satin(), 0.68, 0.5],
        [roundedSlab(0.2, 0.06, 0.03, 0.03), mat.satin(), 0.94, 0.5],
        [roundedSlab(2.14, 0.66, 0.05, 0.07), mat.blue(), 0, 0.03],                     // hero
        [roundedSlab(0.92, 0.08, 0.03, 0.04), mat.ceramic(), -0.5, 0.2, Z + 0.06],       // headline
        [roundedSlab(0.62, 0.08, 0.03, 0.04), mat.ceramic(), -0.65, 0.06, Z + 0.06],
        [roundedSlab(0.38, 0.13, 0.04, 0.065), mat.teal(), -0.77, -0.15, Z + 0.07],      // CTA
        [roundedSlab(0.66, 0.38, 0.05, 0.06), mat.satin(), -0.73, -0.57],               // cards
        [roundedSlab(0.66, 0.38, 0.05, 0.06), mat.satin(), 0, -0.57],
        [roundedSlab(0.66, 0.38, 0.05, 0.06), mat.satin(), 0.73, -0.57],
      ];
      const blocks = spec.map(([geo, m, x, y, z = Z + 0.02]) => ({ mesh: put(geo, m, x, y, z), z }));
      const cta = blocks[7].mesh;
      // pixel cursor
      const cursor = pixels(["#....", "##...", "###..", "####.", "#####", "###..", "#.##.", "...##"], 0.045, mat.satin(), 0.04);
      cursor.children.forEach((c) => (c.position.x += 0.09, c.position.y -= 0.16)); // tip at origin
      g.add(cursor);
      g.rotation.set(-0.36, 0.5, 0.06);
      const PERIOD = 7;
      return {
        object: g,
        tick: (t) => {
          const p = (t % PERIOD) / PERIOD;
          const out = easeInOut(window01(p, 0.88, 0.98)); // the page lifts away at the end
          blocks.forEach((b, i) => {
            const k = easeOut(window01(p, 0.04 + i * 0.035, 0.16 + i * 0.035)) * (1 - out);
            b.mesh.position.z = b.z + (1 - k) * 0.9;
            b.mesh.scale.setScalar(Math.max(1e-3, k));
          });
          // cursor glides in, clicks the CTA, leaves
          const go = easeInOut(window01(p, 0.5, 0.64)), leave = easeInOut(window01(p, 0.8, 0.9));
          cursor.position.set(1.35 + (-0.66 - 1.35) * go + leave * 1.6, -0.75 + (-0.2 + 0.75) * go - leave * 0.4, 0.42);
          cursor.visible = p > 0.48 && p < 0.92;
          const click = Math.sin(clamp01(window01(p, 0.66, 0.72)) * Math.PI);
          cursor.scale.setScalar(1 - click * 0.18);
          cta.scale.setScalar(Math.max(1e-3, cta.scale.x * (1 - click * 0.12)));
          cta.material.color.setHex(click > 0.05 ? BLUE : TEAL);
          g.rotation.y = 0.5 + Math.sin(t * 0.45) * 0.16;
          g.position.y = Math.sin(t * 0.9) * 0.03;
        },
      };
    },

    // Design → development: a UI card drawn as a Figma frame (wireframe + blue selection + handles);
    // a scan line sweeps across and everything behind it becomes the built, solid component.
    design() {
      const g = new THREE.Group();
      const solidPlane = new THREE.Plane(), wirePlane = new THREE.Plane();
      const local = { solid: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), wire: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0) };
      const clipped = (factory) => factory({ clippingPlanes: [solidPlane], clipShadows: true });
      // design side: soft blue "Figma layer" shapes with blue outlines; build side: the real materials
      const lineMat = new THREE.LineBasicMaterial({ color: BLUE, clippingPlanes: [wirePlane] });
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.6, depthWrite: false, clippingPlanes: [wirePlane] });
      const part = (geo, m, x, y, z) => {
        const o = new THREE.Mesh(geo, clipped(m)); o.position.set(x, y, z); g.add(o);
        const ghost = new THREE.Mesh(geo, ghostMat); ghost.position.copy(o.position); g.add(ghost);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), lineMat); e.position.copy(o.position); g.add(e);
        return o;
      };
      part(roundedSlab(2.0, 1.4, 0.08, 0.1), mat.ceramic, 0, 0, 0);
      part(roundedSlab(1.76, 0.62, 0.04, 0.06), mat.paper, 0, 0.27, 0.07);          // image
      part(roundedSlab(1.0, 0.09, 0.03, 0.045), mat.satin, -0.38, -0.17, 0.07);      // title
      part(roundedSlab(0.72, 0.06, 0.02, 0.03), mat.paper, -0.52, -0.31, 0.07);      // text
      part(roundedSlab(0.5, 0.17, 0.05, 0.085), mat.blue, -0.63, -0.5, 0.08);        // button
      part(roundedSlab(0.17, 0.17, 0.05, 0.085), mat.satin, 0.75, -0.5, 0.08);       // icon button
      // Figma selection: blue frame + square handles
      const sel = new THREE.Group(), W = 2.14, H = 1.54, T = 0.012, frameMat = mat.blue();
      [[0, H / 2, W, T], [0, -H / 2, W, T], [W / 2, 0, T, H], [-W / 2, 0, T, H]].forEach(([x, y, w, h]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, T), frameMat); b.position.set(x, y, 0.1); sel.add(b);
      });
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
        const hd = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.04), mat.ceramic()); hd.position.set((sx * W) / 2, (sy * H) / 2, 0.1);
        const rim = new THREE.LineSegments(new THREE.EdgesGeometry(hd.geometry), new THREE.LineBasicMaterial({ color: BLUE })); hd.add(rim);
        sel.add(hd);
      });
      g.add(sel);
      // the scan line (where design turns into build)
      const scan = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.7, 0.018), new THREE.MeshBasicMaterial({ color: TEAL, toneMapped: false }));
      scan.position.z = 0.12; g.add(scan);
      // floating </> tag
      const code = new THREE.Group(), bar = (x, y, rz, len = 0.2) => { const b = new THREE.Mesh(roundedSlab(0.05, len, 0.05, 0.024), mat.satin()); b.position.set(x, y, 0); b.rotation.z = rz; code.add(b); };
      // "<"  "/"  ">" — a bar rotated clockwise (negative z) leans its top to the right
      bar(-0.25, 0.055, -0.85, 0.15); bar(-0.25, -0.055, 0.85, 0.15); bar(0, 0, -0.35, 0.32); bar(0.25, 0.055, 0.85, 0.15); bar(0.25, -0.055, -0.85, 0.15);
      code.position.set(1.18, 0.86, 0.35); g.add(code);
      g.rotation.set(0.32, -0.5, 0.02); g.position.x = -0.05;
      return {
        object: g,
        tick: (t) => {
          const sweep = Math.sin(t * 0.55) * 1.12;
          scan.position.x = sweep;
          g.rotation.y = -0.5 + Math.sin(t * 0.35) * 0.18;
          g.position.y = Math.sin(t * 0.9) * 0.035;
          code.position.y = 0.86 + Math.sin(t * 1.3) * 0.05; code.rotation.y = Math.sin(t * 0.8) * 0.4;
          sel.scale.setScalar(1 + Math.sin(t * 2.2) * 0.004);
          g.updateMatrixWorld(true);
          local.solid.constant = sweep; local.wire.constant = -sweep;
          solidPlane.copy(local.solid).applyMatrix4(g.matrixWorld);
          wirePlane.copy(local.wire).applyMatrix4(g.matrixWorld);
        },
      };
    },

    // A voxel planet (the site's pixels, in 3D) with ripples running over its surface and a moon.
    immersive() {
      const g = new THREE.Group();
      const R = 8, S = 0.124, dirs = [], cols = [];
      const white = new THREE.Color(0xf2f2f0), ink = new THREE.Color(0x232428), blue = new THREE.Color(BLUE), teal = new THREE.Color(TEAL);
      for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, y, z);
        if (Math.abs(d - R) > 0.5) continue;
        dirs.push(new THREE.Vector3(x, y, z));
        // "continents": a smooth pattern over the sphere
        const n = Math.sin(x * 0.7 + 1.3) * Math.cos(y * 0.6) + Math.sin(z * 0.8 - y * 0.3);
        cols.push(n > 1.15 ? blue : n > 0.7 ? ink : ((x * 7 + y * 13 + z * 5) % 41 + 41) % 41 === 0 ? teal : white);
      }
      const voxels = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.9, S * 0.9, S * 0.9), new THREE.MeshPhysicalMaterial({ roughness: 0.34, clearcoat: 0.5 }), dirs.length);
      cols.forEach((c, i) => voxels.setColorAt(i, c));
      g.add(voxels);
      const orbit = new THREE.Group();
      orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.008, 8, 160), mat.satin()));
      const moon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat.blue());
      const trail = [0, 1, 2].map((i) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07 - i * 0.015, 0.07 - i * 0.015, 0.07 - i * 0.015), mat.teal()); orbit.add(c); return c; });
      orbit.add(moon);
      orbit.rotation.set(1.2, 0.3, -0.35);
      g.add(orbit);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3(), wave = new THREE.Vector3();
      return {
        object: g,
        tick: (t) => {
          // a ripple front travelling over the surface (like the grid ripple on the page)
          wave.set(Math.cos(t * 0.5), Math.sin(t * 0.7) * 0.6, Math.sin(t * 0.5)).normalize();
          for (let i = 0; i < dirs.length; i++) {
            const d = dirs[i], len = d.length();
            const along = (d.x * wave.x + d.y * wave.y + d.z * wave.z) / len; // -1..1
            const ph = along * 7 - t * 3.2;
            const lift = Math.max(0, Math.sin(ph)) * Math.max(0, along) * 0.11;
            pos.copy(d).multiplyScalar(S + (lift * S * 6) / len);
            m.compose(pos, q, one);
            voxels.setMatrixAt(i, m);
          }
          voxels.instanceMatrix.needsUpdate = true;
          voxels.rotation.set(0.35, t * 0.22, 0);
          const a = t * 0.9;
          moon.position.set(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0); moon.rotation.set(t, t * 1.2, 0);
          trail.forEach((c, i) => { const b = a - 0.16 * (i + 1); c.position.set(Math.cos(b) * 1.55, Math.sin(b) * 1.55, 0); });
          g.position.y = Math.sin(t * 0.8) * 0.04;
        },
      };
    },

    // Search: a query types into the bar; your result (blue) climbs #3 → #2 → #1, an AI sparkle pops.
    search() {
      const g = new THREE.Group();
      const barBody = new THREE.Mesh(roundedSlab(2.3, 0.38, 0.08, 0.19), mat.ceramic()); barBody.position.y = 0.74; g.add(barBody);
      const lens = new THREE.Group();
      lens.add(new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.017, 12, 32), mat.satin()));
      const h = new THREE.Mesh(roundedSlab(0.03, 0.08, 0.03, 0.014), mat.satin()); h.position.set(0.07, -0.07, 0); h.rotation.z = Math.PI / 4; lens.add(h);
      lens.position.set(-0.94, 0.75, 0.07); g.add(lens);
      const query = new THREE.Mesh(roundedSlab(0.9, 0.07, 0.03, 0.035, true), mat.satin()); query.position.set(-0.78, 0.74, 0.07); g.add(query);
      const caret = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.02), mat.blue()); caret.position.set(-0.75, 0.74, 0.08); g.add(caret);
      const sparkle = new THREE.Mesh(sparkleGeometry(0.13, 0.04), mat.teal()); sparkle.position.set(0.95, 0.74, 0.1); g.add(sparkle);
      // results: [ours?]
      const card = (ours) => {
        const c = new THREE.Group();
        c.add(new THREE.Mesh(roundedSlab(2.1, 0.4, 0.06, 0.08), mat.ceramic()));
        const add = (geo, m, x, y) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, 0.05); c.add(o); };
        add(roundedSlab(0.14, 0.14, 0.03, 0.035), ours ? mat.blue() : mat.paper(), -0.86, 0.02);
        add(roundedSlab(ours ? 0.9 : 0.76, 0.07, 0.025, 0.035), ours ? mat.blue() : mat.satin(), -0.69 + (ours ? 0.45 : 0.38), 0.07);
        add(roundedSlab(1.2, 0.045, 0.02, 0.022), mat.paper(), -0.69 + 0.6, -0.07);
        if (ours) add(roundedSlab(0.05, 0.3, 0.03, 0.025), mat.blue(), -1.0, 0);
        g.add(c);
        return c;
      };
      const ours = card(true), others = [card(false), card(false)];
      const SLOTS = [0.18, -0.3, -0.78];
      g.rotation.set(-0.34, 0.46, 0.04);
      const PERIOD = 8;
      return {
        object: g,
        tick: (t) => {
          const p = (t % PERIOD) / PERIOD;
          const typed = easeOut(window01(p, 0.02, 0.22));
          query.scale.x = Math.max(1e-3, typed);
          caret.position.x = -0.76 + typed * 0.9;
          caret.visible = Math.floor(t * 2.4) % 2 === 0 || p < 0.24;
          // ours: slot 2 → 1 → 0, others shuffle down; reset quietly at the very end
          const up1 = easeInOut(window01(p, 0.3, 0.42)), up2 = easeInOut(window01(p, 0.5, 0.62));
          const reset = easeInOut(window01(p, 0.93, 1));
          // slots: 0 = #1 … 2 = #3. Ours climbs over the others (lifted in z while it moves).
          const lerpSlot = (s) => { s = Math.min(2, Math.max(0, s)); const i = Math.min(1, Math.floor(s)), f = s - i; return SLOTS[i] + (SLOTS[i + 1] - SLOTS[i]) * f; };
          const hop = (k) => Math.sin(Math.PI * k);
          ours.position.set(0, lerpSlot(2 - up1 - up2 + reset * 2), 0.06 + (hop(up1) + hop(up2) + hop(reset)) * 0.28);
          others[0].position.y = lerpSlot(up2 - reset);     // #1 → #2 → back
          others[1].position.y = lerpSlot(1 + up1 - reset); // #2 → #3 → back
          const top = easeOut(window01(p, 0.62, 0.7)) * (1 - reset);
          sparkle.scale.setScalar(Math.max(1e-3, 0.4 + top * 0.8));
          sparkle.position.set(1.18, SLOTS[0] + 0.24, 0.2 + top * 0.1);
          sparkle.rotation.z = t * 1.4;
          g.rotation.y = 0.46 + Math.sin(t * 0.4) * 0.12;
          g.position.y = Math.sin(t * 0.9) * 0.03;
        },
      };
    },

    // Performance: a dial of 60 ticks filling to 96 around a pixel lightning bolt, then easing back.
    support() {
      const g = new THREE.Group();
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 96), mat.ceramic()); dial.rotation.x = Math.PI / 2; g.add(dial);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 16, 120), mat.satin()); g.add(rim);
      const N = 60;
      const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.17, 0.05), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8 }), N);
      g.add(ticks);
      const off = new THREE.Color(0xc9cdcf), on = new THREE.Color(BLUE), m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
      const bolt = pixels(["....##", "...##.", "..##..", ".#####", "...##.", "..##..", ".##...", "##...."], 0.085, mat.blue(), 0.1);
      bolt.position.z = 0.1; g.add(bolt);
      g.rotation.set(-0.32, 0.5, 0.02);
      const PERIOD = 6;
      return {
        object: g,
        tick: (t) => {
          const p = (t % PERIOD) / PERIOD;
          const fill = 0.96 * easeOut(window01(p, 0.05, 0.55)) * (1 - easeInOut(window01(p, 0.86, 0.98)));
          for (let i = 0; i < N; i++) {
            const f = i / N, lit = f < fill, a = Math.PI / 2 - f * Math.PI * 2;
            pos.set(Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0.09 + (lit ? 0.03 : 0));
            q.setFromAxisAngle(z, a - Math.PI / 2);
            sc.set(1, lit ? 1.15 : 0.8, 1);
            m.compose(pos, q, sc);
            ticks.setMatrixAt(i, m);
            ticks.setColorAt(i, lit ? on : off);
          }
          ticks.instanceMatrix.needsUpdate = true;
          ticks.instanceColor.needsUpdate = true;
          const full = clamp01((fill - 0.9) / 0.06);
          bolt.scale.setScalar(1 + full * 0.08 + Math.sin(t * 6) * full * 0.02);
          g.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.16;
          g.position.y = Math.sin(t * 0.9) * 0.035;
        },
      };
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
