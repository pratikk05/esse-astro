// Ecommerce service model (used by service-models.js): frosted-glass shopping cart.
// Frosted glass basket on a chrome frame, blue handle + wheels, floating inside a chrome orbit ring
// with two teal tickets. Products drop into the basket and show through the glass.
const BLUE = 0x2929fd;
const TEAL = 0x1bdbce;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const window01 = (p, a, b) => clamp01((p - a) / (b - a));

export function buildCart(THREE) {
  const g = new THREE.Group();
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe4e8ee, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 });
  const blue = new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f6fa, roughness: 0.3, clearcoat: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xeef2ff, transmission: 1, roughness: 0.38, thickness: 0.35, ior: 1.4,
    attenuationColor: new THREE.Color(0xa9b8ff), attenuationDistance: 1.2, clearcoat: 1, clearcoatRoughness: 0.1,
    side: THREE.DoubleSide, specularIntensity: 1,
  });
  const blueGlass = new THREE.MeshPhysicalMaterial({ color: 0x5b63ff, transmission: 0.55, roughness: 0.3, thickness: 0.2, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

  // tube between two points
  const Y = new THREE.Vector3(0, 1, 0);
  const tube = (a, b, r, m, parent) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), m);
    o.position.copy(a).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(Y, d.normalize());
    parent.add(o);
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); j.position.copy(b); parent.add(j);
    return o;
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- the cart (its own group so it can float and sway) ----
  const cart = new THREE.Group(); g.add(cart);
  const TOPY = 0.62, BOTY = -0.08, TX = 0.78, TZ = 0.52, BX = 0.6, BZ = 0.4;
  const top = [v(-TX, TOPY, -TZ), v(TX, TOPY, -TZ), v(TX, TOPY, TZ), v(-TX, TOPY, TZ)];
  const bot = [v(-BX, BOTY, -BZ), v(BX, BOTY, -BZ), v(BX, BOTY, BZ), v(-BX, BOTY, BZ)];
  // open-topped tapered tub
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(bot[i], bot[j], top[j], top[i]); }
  quad(bot[3], bot[2], bot[1], bot[0]);
  const tubGeo = new THREE.BufferGeometry(); tubGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tubGeo.computeVertexNormals();
  cart.add(new THREE.Mesh(tubGeo, glass));
  // blue tinted inner back wall (the handle side)
  const back = new THREE.BufferGeometry();
  const inset = (p, k) => p.clone().multiplyScalar(k);
  back.setAttribute("position", new THREE.Float32BufferAttribute([...inset(bot[1], 0.97).toArray(), ...inset(bot[2], 0.97).toArray(), ...inset(top[2], 0.97).toArray(), ...inset(bot[1], 0.97).toArray(), ...inset(top[2], 0.97).toArray(), ...inset(top[1], 0.97).toArray()], 3));
  back.computeVertexNormals();
  cart.add(new THREE.Mesh(back, blueGlass));
  // chrome rim + corner posts
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; tube(top[i], top[j], 0.048, chrome, cart); tube(bot[i], top[i], 0.03, chrome, cart); }
  // vertical slots on the long sides (raised glass capsules)
  const slotGeo = new THREE.CapsuleGeometry(0.035, 0.32, 6, 16);
  [-1, 1].forEach((side) => {
    for (let k = 0; k < 5; k++) {
      const x = -0.44 + k * 0.22;
      const s = new THREE.Mesh(slotGeo, white); s.material = chrome;
      const zTop = TZ * side, zBot = BZ * side, z = (zTop + zBot) / 2 + side * 0.02;
      s.position.set(x * 0.92, (TOPY + BOTY) / 2 + 0.02, z);
      s.rotation.x = side * Math.atan2(TZ - BZ, TOPY - BOTY);
      s.scale.set(1, 1, 0.35);
      cart.add(s);
    }
  });
  // blue label on the front end
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.42), blue);
  label.position.set(-(TX + BX) / 2 - 0.03, (TOPY + BOTY) / 2 + 0.02, 0); label.rotation.z = -Math.atan2(TX - BX, TOPY - BOTY);
  cart.add(label);
  // handle
  const HB = v(1.08, 1.12, 0);
  [-1, 1].forEach((s) => { tube(v(TX, TOPY, TZ * s), v(HB.x - 0.05, HB.y - 0.06, TZ * s * 0.95), 0.042, chrome, cart); });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, TZ * 2.2, 28), blue); bar.rotation.x = Math.PI / 2; bar.position.copy(HB); cart.add(bar);
  [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 28), blue); c.rotation.x = Math.PI / 2; c.position.set(HB.x, HB.y, TZ * 1.1 * s + 0.025 * s); cart.add(c); });
  // undercarriage + wheels
  const WY = -0.36;
  [-1, 1].forEach((s) => {
    const z = BZ * s * 0.9;
    tube(v(-0.6, WY, z), v(0.72, WY, z), 0.038, chrome, cart);
    tube(v(BX, BOTY, BZ * s), v(0.72, WY, z), 0.034, chrome, cart);
    tube(v(-0.6, WY, z), v(-0.66, WY + 0.08, z), 0.038, chrome, cart);
  });
  tube(v(-0.66, WY + 0.08, -BZ * 0.9), v(-0.66, WY + 0.08, BZ * 0.9), 0.038, chrome, cart);
  const wheels = [];
  [[-0.5, -1], [-0.5, 1], [0.6, -1], [0.6, 1]].forEach(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, WY - 0.12, BZ * s * 0.9);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 32), blue); tyre.rotation.x = Math.PI / 2; w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 24), white); hub.rotation.x = Math.PI / 2; w.add(hub);
    cart.add(w); wheels.push(w);
  });

  // products that drop into the basket (seen through the frosted glass)
  const products = [
    new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), blue),
    new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), new THREE.MeshPhysicalMaterial({ color: TEAL, roughness: 0.25, clearcoat: 1 })),
  ];
  const rest = [v(-0.2, 0.1, -0.05), v(0.22, 0.08, 0.08)];
  products.forEach((p) => cart.add(p));

  // ---- orbit ring with two chrome beads ----
  const orbit = new THREE.Group(); orbit.rotation.set(1.25, 0, -0.32); orbit.position.y = 0.05; g.add(orbit);
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.008, 8, 200), chrome));
  const beads = [0, Math.PI].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), chrome); orbit.add(b); return b; });

  // ---- teal "tickets" (rounded glassy cards with a white coin) ----
  const ticket = () => {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.025), new THREE.MeshPhysicalMaterial({ color: TEAL, transmission: 0.6, roughness: 0.25, thickness: 0.1, transparent: true, opacity: 0.92 })));
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 32), white); coin.rotation.x = Math.PI / 2; coin.position.z = 0.015; t.add(coin);
    g.add(t); return t;
  };
  const tickets = [ticket(), ticket()];

  g.rotation.set(0.42, -0.62, 0);
  g.position.y = -0.22; // centre the cart (wheels to handle) in the frame
  const PERIOD = 6;
  return {
    object: g,
    tick: (t) => {
      const p = (t % PERIOD) / PERIOD;
      cart.position.y = 0.08 + Math.sin(t * 1.2) * 0.05;
      cart.rotation.y = Math.sin(t * 0.5) * 0.12;
      wheels.forEach((w) => (w.rotation.z = -t * 1.5));
      products.forEach((m, i) => {
        const a = 0.1 + i * 0.25, k = window01(p, a, a + 0.14), fall = k * k;
        const out = easeOut(window01(p, 0.88, 0.98));
        m.position.set(rest[i].x, 1.5 + (rest[i].y - 1.5) * fall, rest[i].z);
        m.rotation.set(k * 2 + i, k * 2.6, 0.3);
        m.scale.setScalar(Math.max(1e-3, easeOut(window01(p, a - 0.05, a)) * (1 - out)));
      });
      const a = t * 0.6;
      beads[0].position.set(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0);
      beads[1].position.set(Math.cos(a + Math.PI) * 1.55, Math.sin(a + Math.PI) * 1.55, 0);
      tickets[0].position.set(-1.35, 0.95 + Math.sin(t * 1.1) * 0.06, 0.2); tickets[0].rotation.set(0.2, 0.5, 0.35 + Math.sin(t * 0.8) * 0.1);
      tickets[1].position.set(1.3, -0.55 + Math.sin(t * 1.3 + 1) * 0.06, 0.4); tickets[1].rotation.set(-0.2, -0.6, -0.3 + Math.sin(t * 0.9) * 0.1);
    },
  };
}
