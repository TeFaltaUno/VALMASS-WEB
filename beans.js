/* VALMASS WEB · granos de café 3D procedurales (Three.js, sin modelos externos) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const G = window.VALMASS || { hero: 0, origins: -1, mx: 0, my: 0, active: true };
const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (e) { console.warn('WebGL no disponible', e); canvas.remove(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
camera.position.set(0, 0, 9);

scene.add(new THREE.HemisphereLight(0xffe8c8, 0x1a0e06, 1.1));
const key = new THREE.DirectionalLight(0xfff1d6, 2.6); key.position.set(4, 5, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xf2b51d, 3.2); rim.position.set(-5, 2, -4); scene.add(rim);
const fill = new THREE.PointLight(0xb4542e, 18, 20); fill.position.set(3, -3, 3); scene.add(fill);

/* ---------- geometría del grano ---------- */
function beanGeometry(detail = 64) {
  const g = new THREE.SphereGeometry(1, detail, Math.round(detail * .75));
  const p = g.attributes.position, v = new THREE.Vector3();
  const colors = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    x *= .7; y *= 1.0; z *= .56;                // elipsoide: largo en Y, achatado en Z
    if (z > 0) z *= .42;                        // cara plana
    const sx = .09 * Math.sin(y * 2.4);        // surco en S
    const d = x - sx;
    const groove = Math.exp(-(d * d) / .0065) * Math.pow(Math.max(0, 1 - y * y), .6) * .3;
    if (v.z > 0) z -= groove;
    z += .01 * Math.sin(x * 22 + y * 15);      // textura sutil
    p.setXYZ(i, x, y, z);
    const tone = .9 + Math.random() * .08 - groove * 2.2;
    colors.push(tone, tone, tone);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
const mat = new THREE.MeshPhysicalMaterial({
  color: 0x4a2412, roughness: .5, metalness: 0, clearcoat: .35, clearcoatRoughness: .4,
  sheen: .5, sheenColor: new THREE.Color(0xc07a34), vertexColors: true, envMapIntensity: .7
});

/* ---------- grano protagonista ---------- */
const hero = new THREE.Mesh(beanGeometry(96), mat);
hero.scale.setScalar(1.35);
scene.add(hero);

/* ---------- granos que orbitan / llueven ---------- */
const COUNT = G.mobile ? 46 : 90;
const small = new THREE.InstancedMesh(beanGeometry(28), mat, COUNT);
small.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(small);
const data = Array.from({ length: COUNT }, (_, i) => {
  const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
  const r = 2.6 + Math.random() * 3.2;
  return {
    dir: new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph) * .6),
    r, s: .12 + Math.random() * .22,
    rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    spin: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(1.4),
    // lluvia de orígenes
    rx: (Math.random() * 2 - 1), ry: Math.random(), rz: -Math.random() * 6 + 1, rs: .45 + Math.random() * .9
  };
});
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize, { passive: true }); resize();

const clock = new THREE.Clock();
let mx = 0, my = 0, t = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  const heroOn = G.active && G.hero < .995, orgOn = G.active && G.origins >= 0;
  const op = heroOn ? 1 - Math.max(0, (G.hero - .8) / .2) : orgOn ? Math.min(1, G.origins * 6, G.orgFade ?? 1) : 0;
  canvas.style.opacity = op;
  if (op <= 0.001) return;

  mx += (G.mx - mx) * .06; my += (G.my - my) * .06;
  const narrow = camera.aspect < .8;

  if (heroOn) {
    const p = G.hero, e = p * p * (3 - 2 * p);
    hero.visible = true;
    hero.position.set(mx * .25, -my * .2 + Math.sin(t * .8) * .08, e * 6.2);
    hero.rotation.set(-.25 + my * .3 + e * 2.2, Math.sin(t * .35) * 1.1 + mx * .5 + e * 5, .4 + Math.sin(t * .5) * .1);
    hero.scale.setScalar((narrow ? 1.05 : 1.35) * (1 + e * .4));
    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      d.rot.x += d.spin.x * dt; d.rot.y += d.spin.y * dt; d.rot.z += d.spin.z * dt;
      const r = d.r * (narrow ? .7 : 1) * (1 + e * 2.4);
      const a = t * .06 + i;
      pos.copy(d.dir).multiplyScalar(r).applyAxisAngle(new THREE.Vector3(0, 1, 0), t * .05);
      pos.z += e * 5 + Math.sin(a) * .1; pos.y += Math.sin(t * .7 + i) * .08;
      q.setFromEuler(d.rot); scl.setScalar(d.s * (1 - e * .2));
      m4.compose(pos, q, scl); small.setMatrixAt(i, m4);
    }
  } else {
    // ORÍGENES: los granos suben lentamente, con parallax del scroll
    hero.visible = false;
    const p = G.origins, wide = narrow ? 2.6 : 6.5;
    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      d.rot.x += d.spin.x * dt * .6; d.rot.y += d.spin.y * dt * .6;
      const y = (((d.ry + t * .02 * d.rs + p * 1.4 * d.rs) % 1) + 1) % 1;
      pos.set(d.rx * wide + mx * .3 * d.rs, (y - .5) * 9, d.rz);
      q.setFromEuler(d.rot); scl.setScalar(d.s * 1.2);
      m4.compose(pos, q, scl); small.setMatrixAt(i, m4);
    }
  }
  small.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
