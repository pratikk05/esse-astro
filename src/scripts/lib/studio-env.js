// Studio lighting shared by the site's real-time 3D (Services models, About rings): a neutral room with
// an overhead softbox and two strip lights, pre-filtered for PBR reflections. Returns the env texture.
export function createStudioEnv(THREE, renderer, { room = 0.55, top = 6, left = 5, right = 3 } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(room, room * 1.02, room * 1.05), side: THREE.BackSide })));
  const softbox = (w, h, pos, rot, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.copy(pos); m.rotation.set(...rot); scene.add(m);
  };
  softbox(4, 3, new THREE.Vector3(0, 2.9, 0.5), [Math.PI / 2, 0, 0], top);
  softbox(0.8, 4, new THREE.Vector3(-4.9, 1, 1), [0, Math.PI / 2, 0], left);
  softbox(0.6, 4, new THREE.Vector3(4.9, 1, -1), [0, -Math.PI / 2, 0], right);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return env;
}
