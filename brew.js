/* VALMASS WEB · Laboratorio 3D — "La gota", espresso, filtrado y latte art
   Todo procedural con Three.js: no usa modelos ni videos. El scroll maneja la animación. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const sec = document.getElementById('lab');
const canvas = sec && sec.querySelector('.lab-canvas');
if (canvas) init();

function init() {
  const clamp = (n, a = 0, b = 1) => Math.min(Math.max(n, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b) => clamp((v - a) / (b - a));
  const ss = (a, b, v) => { const t = map(v, a, b); return t * t * (3 - 2 * t); };
  const V2 = THREE.Vector2, V3 = THREE.Vector3;
  const isMobile = () => innerWidth <= 900;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .03).texture;
  scene.background = new THREE.Color(0x0b0806);
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 200);
  scene.add(camera);

  /* ---------- fondo con degradé (también lo refracta el vidrio) ---------- */
  function radialTex(inner, outer, size = 512) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex('#ffffff', '#000000'), color: 0x6b3a14, depthWrite: false }));
  backdrop.position.z = -40; backdrop.scale.set(95, 95, 1); camera.add(backdrop);
  const shadowTex = radialTex('rgba(0,0,0,.75)', 'rgba(0,0,0,0)', 256);
  const contact = (r, y, op = .8) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: op })); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };

  /* ---------- luces ---------- */
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x140a04, .7));
  const key = new THREE.DirectionalLight(0xfff2e0, 3); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf2b51d, 4); rim.position.set(-5, 3, -6); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffd7a0, 2.2); rim2.position.set(6, 1, -4); scene.add(rim2);
  const glow = new THREE.PointLight(0xff9a3c, 12, 12); glow.position.set(0, -1, 2); scene.add(glow);

  /* ---------- materiales ---------- */
  const M = {
    metal: new THREE.MeshStandardMaterial({ color: 0xd9d6d0, metalness: 1, roughness: .18 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: .9, roughness: .3 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x0d0d0d, metalness: .3, roughness: .32, clearcoat: .6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8b4f26, roughness: .45, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .03, thickness: .12, ior: 1.5, side: THREE.DoubleSide, envMapIntensity: 1.2, transparent: true }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf3efe8, roughness: .22, clearcoat: .7, clearcoatRoughness: .2, side: THREE.DoubleSide }),
    yellow: new THREE.MeshPhysicalMaterial({ color: 0xf2b21a, roughness: .28, clearcoat: .8, clearcoatRoughness: .15, side: THREE.DoubleSide }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: .95, side: THREE.DoubleSide }),
    coffee: new THREE.MeshPhysicalMaterial({ color: 0x2a1206, roughness: .06, clearcoat: 1, clearcoatRoughness: .05, metalness: .05, envMapIntensity: 1.4 }),
    espresso: new THREE.MeshPhysicalMaterial({ color: 0x1e0c04, roughness: .2, clearcoat: .8 }),
    crema: new THREE.MeshPhysicalMaterial({ color: 0xb87838, roughness: .55, clearcoat: .3 }),
    filter: new THREE.MeshPhysicalMaterial({ color: 0x7a3410, transmission: .55, thickness: 1.2, roughness: .05, ior: 1.34, attenuationColor: new THREE.Color(0x4a1604), attenuationDistance: .5, transparent: true }),
    drop: new THREE.MeshPhysicalMaterial({ color: 0xf2a24a, transmission: .92, thickness: .7, roughness: .0, ior: 1.36, attenuationColor: new THREE.Color(0xb0520e), attenuationDistance: .7, clearcoat: 1, envMapIntensity: 2.2, specularIntensity: 1, emissive: new THREE.Color(0x5a2200), emissiveIntensity: .35 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, thickness: .08, ior: 1.33, transparent: true, envMapIntensity: 1.5 }),
    milk: new THREE.MeshPhysicalMaterial({ color: 0xfbf4e8, roughness: .3, clearcoat: .5, sheen: .4 }),
    bed: new THREE.MeshStandardMaterial({ color: 0x3a1c0c, roughness: .9 })
  };

  const at = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); return m; };
  const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);

  /* ---------- streams con shader (rayas "tiger striping") ---------- */
  const streamUniforms = { uTime: { value: 0 } };
  function streamMat(c1, c2, freq = 38, speed = 10) {
    return new THREE.ShaderMaterial({
      uniforms: { ...streamUniforms, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) }, uFreq: { value: freq }, uSpeed: { value: speed }, uLight: { value: 0 } },
      vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv=uv; vec3 p=position; p.x+=sin(uv.y*22.0+uTime*9.0)*0.012*(1.0-uv.y); p.z+=cos(uv.y*17.0+uTime*7.0)*0.01*(1.0-uv.y);
          vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime,uFreq,uSpeed,uLight; uniform vec3 c1,c2; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float s=0.5+0.5*sin(vUv.y*uFreq+uTime*uSpeed+sin(vUv.y*7.0+uTime*3.0)*1.5);
          vec3 col=mix(c1,c2,s*0.75+uLight); float fr=pow(1.0-abs(dot(vN,vV)),2.0);
          col+=fr*vec3(1.0,0.75,0.4)*0.55; col+=pow(max(dot(vN,normalize(vec3(0.4,0.6,0.7))),0.0),24.0)*0.6;
          gl_FragColor=vec4(col,1.0);
          #include <colorspace_fragment>
        }`
    });
  }

  /* ---------- vapor ---------- */
  function makeSteam(n, spread) {
    const g = new THREE.BufferGeometry(), seeds = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seeds[i * 3] = Math.random(); seeds[i * 3 + 1] = Math.random(); seeds[i * 3 + 2] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: streamUniforms.uTime, uAmt: { value: 0 }, uSpread: { value: spread }, uPx: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute vec3 seed; uniform float uTime,uSpread,uPx; varying float vA;
        void main(){ float t=fract(seed.x+uTime*0.07*(0.6+seed.y)); vec3 p=vec3((seed.y-0.5)*uSpread+sin(t*6.0+seed.z*6.28)*0.25*t,t*2.6,(seed.z-0.5)*uSpread*0.6);
          vA=sin(t*3.1416)*(0.5+seed.z*0.5); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(60.0+120.0*t)*uPx/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uAmt; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA*uAmt*0.16; gl_FragColor=vec4(vec3(1.0,0.96,0.9),a); }`
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
  }

  /* =========================================================
     CAPÍTULO 1 · LA GOTA
     ========================================================= */
  const c1 = new THREE.Group(); scene.add(c1);
  const SPOUT_Y = 2.05, SURF_Y = -1.35;
  const pf1 = new THREE.Group(); c1.add(pf1);
  pf1.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.1, .45, 64), M.metal), 0, SPOUT_Y + .75, 0));
  pf1.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, .25, 32), M.metal), 0, SPOUT_Y + .42, 0));
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(.13, .085, .34, 32, 1, true), M.metal); tip.position.y = SPOUT_Y + .17; pf1.add(tip);
  const tipRing = new THREE.Mesh(new THREE.TorusGeometry(.085, .018, 12, 32), M.metal); tipRing.rotation.x = Math.PI / 2; tipRing.position.y = SPOUT_Y; pf1.add(tipRing);
  // taza amarilla con superficie de café que hace ondas
  const cup1 = new THREE.Mesh(lathe([[2.3, -1.6], [2.5, -1.45], [2.62, -1.28], [2.66, -1.22], [2.6, -1.22], [2.55, -1.3]], 96), M.yellow); c1.add(cup1);
  const surfGeo = new THREE.RingGeometry(.0001, 2.58, isMobile() ? 110 : 170, isMobile() ? 50 : 76);
  surfGeo.rotateX(-Math.PI / 2);
  const surfBase = surfGeo.attributes.position.array.slice();
  const surf = new THREE.Mesh(surfGeo, M.coffee); surf.position.y = SURF_Y; c1.add(surf);
  const dropGeo = new THREE.SphereGeometry(1, 64, 48), dropBase = dropGeo.attributes.position.array.slice();
  const drop = new THREE.Mesh(dropGeo, M.drop); c1.add(drop);
  const drop2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), M.drop); c1.add(drop2); // gota del rebote
  const crownN = 26;
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.drop, crownN); c1.add(crown);
  const crownSeed = Array.from({ length: crownN }, (_, i) => ({ a: i / crownN * Math.PI * 2 + Math.random() * .2, v: 1.3 + Math.random() * .9, u: 2.2 + Math.random() * 1.4, s: .025 + Math.random() * .03 }));
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(.06, .16, 1, 24, 1), M.coffee); c1.add(jet);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new V3(), p4 = new V3();

  function shapeDrop(k, neck) { // k: estiramiento, neck: cuello hacia arriba
    const a = dropGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const x = dropBase[i], y = dropBase[i + 1], z = dropBase[i + 2];
      const up = Math.max(0, y);
      const r = 1 - neck * Math.pow(up, 1.6) * .72;
      a[i] = x * r; a[i + 1] = y > 0 ? y * k : y * (1 + (k - 1) * .25); a[i + 2] = z * r;
    }
    dropGeo.attributes.position.needsUpdate = true; dropGeo.computeVertexNormals();
  }
  function ripple(rt, amb, time) {
    const a = surfGeo.attributes.position.array;
    const front = rt * 3.2;
    for (let i = 0; i < a.length; i += 3) {
      const x = surfBase[i], z = surfBase[i + 2], r = Math.hypot(x, z);
      let h = Math.sin(x * 1.7 + time * .8) * Math.cos(z * 1.3 + time * .6) * .012 * amb;
      if (rt > 0 && rt < 1) {
        const d = r - front, env = Math.exp(-d * d * 2.2) * Math.exp(-rt * 2.4);
        h += Math.sin(d * 13) * .11 * env;
        h -= Math.exp(-r * r * 30) * .18 * Math.max(0, 1 - rt * 6); // cráter del impacto
      }
      h *= Math.min(1, (2.58 - r) * 3);
      a[i + 1] = h;
    }
    surfGeo.attributes.position.needsUpdate = true; surfGeo.computeVertexNormals();
  }
  function updateDrop(t, time) {
    // dos gotas por capítulo
    const u = (t * 2) % 1, cycle = Math.floor(t * 2);
    const R = .19;
    let rt = -1;
    drop.visible = true; drop2.visible = false; jet.visible = false; crown.visible = false;
    if (u < .42) { // se forma colgando del pico
      const f = ss(0, .42, u), size = lerp(.06, R, f), k = lerp(1.1, 2.1, ss(.15, .42, u)), neck = ss(.1, .42, u);
      shapeDrop(k, neck); drop.scale.setScalar(size);
      drop.position.set(0, SPOUT_Y - size * .8 - (k - 1) * size * .2, 0);
    } else if (u < .64) { // cae
      const f = map(u, .42, .64), wob = Math.exp(-f * 4) * Math.sin(f * 30);
      shapeDrop(1 + .9 * Math.exp(-f * 6) + wob * .12, Math.exp(-f * 9));
      drop.scale.setScalar(R);
      drop.position.set(0, lerp(SPOUT_Y - R * 1.1, SURF_Y + R * .5, f * f), 0);
    } else { // impacto: onda, corona y jet
      drop.visible = false; rt = map(u, .64, 1);
      const tt = rt * .9;
      crown.visible = true;
      crownSeed.forEach((c, i) => {
        const y = SURF_Y + c.u * tt - 4.2 * tt * tt;
        const rr = .15 + c.v * tt;
        p4.set(Math.cos(c.a) * rr, Math.max(y, SURF_Y - .2), Math.sin(c.a) * rr);
        s4.setScalar(y > SURF_Y ? c.s * (1 - rt * .5) : 0);
        m4.compose(p4, q4, s4); crown.setMatrixAt(i, m4);
      });
      crown.instanceMatrix.needsUpdate = true;
      const jh = Math.sin(Math.PI * map(rt, .08, .6)) * .95;
      jet.visible = jh > .01; jet.scale.set(1, Math.max(jh, .001), 1); jet.position.y = SURF_Y + jh / 2;
      const r2 = map(rt, .35, .85);
      if (r2 > 0 && r2 < 1) { drop2.visible = true; drop2.scale.setScalar(.075); drop2.position.y = SURF_Y + .95 + 1.4 * r2 - 4.4 * r2 * r2 * 1.2; if (drop2.position.y < SURF_Y) drop2.visible = false; }
    }
    ripple(rt, 1, time);
    return cycle;
  }

  /* =========================================================
     CAPÍTULO 2 · ESPRESSO (portafiltro con mango de madera)
     ========================================================= */
  const c2 = new THREE.Group(); scene.add(c2);
  const head = new THREE.Group(); c2.add(head);
  head.add(at(new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 3.4), M.black), 0, 4.55, -.6));
  head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.2, .55, 64), M.metal), 0, 3.18, 0));
  head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .08, 64), M.metalDark), 0, 2.88, 0));
  const pf = new THREE.Group(); c2.add(pf);
  pf.add(new THREE.Mesh(lathe([[0, -.42], [.85, -.42], [.98, -.3], [1.02, 0], [1.08, .02], [1.08, .08], [.95, .08], [.92, -.3], [0, -.33]], 64), M.metal));
  const ears = new THREE.Mesh(new THREE.TorusGeometry(1.05, .05, 12, 48), M.metal); ears.rotation.x = Math.PI / 2; ears.position.y = .05; pf.add(ears);
  const neckB = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .9, 24), M.metal); neckB.rotation.z = Math.PI / 2; neckB.position.set(1.35, -.18, 0); pf.add(neckB);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, 2.2, 32), M.wood); handle.rotation.z = Math.PI / 2 + .12; handle.position.set(2.85, -.32, 0); pf.add(handle);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.26, 24, 16), M.wood); cap.position.set(3.95, -.45, 0); pf.add(cap);
  const spoutBlock = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .28, 24), M.metal); spoutBlock.position.y = -.55; pf.add(spoutBlock);
  const spoutL = new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, .32, 16), M.metal), spoutR = spoutL.clone();
  spoutL.position.set(-.2, -.8, 0); spoutL.rotation.z = -.35; spoutR.position.set(.2, -.8, 0); spoutR.rotation.z = .35; pf.add(spoutL, spoutR);
  // vaso
  const GLASS_Y = -1.55;
  const glass = new THREE.Mesh(lathe([[0, 0], [.56, 0], [.62, .05], [.64, .12], [.74, 1.38], [.77, 1.42], [.72, 1.42], [.6, .16], [0, .16]], 72), M.glass); glass.position.y = GLASS_Y; c2.add(glass);
  const liqGeo = new THREE.CylinderGeometry(.71, .59, 1, 48); liqGeo.translate(0, .5, 0);
  const liq = new THREE.Mesh(liqGeo, M.espresso); liq.position.y = GLASS_Y + .17; c2.add(liq);
  const crema = new THREE.Mesh(new THREE.CylinderGeometry(.72, .7, .1, 48), M.crema); c2.add(crema);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(5, .12, 2.6), M.metalDark); tray.position.y = GLASS_Y - .07; c2.add(tray);
  for (let i = -9; i <= 9; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, 2.4), M.metal); s.position.set(i * .25, GLASS_Y + .0, 0); c2.add(s); }
  const sMat = streamMat('#3a1606', '#c47a30', 44, 12);
  const stL = new THREE.Mesh(new THREE.CylinderGeometry(.032, .022, 1, 16, 40, true), sMat), stR = stL.clone();
  c2.add(stL, stR);
  const steam2 = makeSteam(70, .9); c2.add(steam2);
  const dripsE = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.drop, 8); c2.add(dripsE);
  c2.add(contact(1.4, GLASS_Y + .02, .6));
  function updateEsp(t, time) {
    // 0–.14 el portafiltro sube y traba · .14–.24 primeras gotas · .24–.86 extracción · luego cierra
    const lock = ss(0, .14, t);
    pf.position.set(0, lerp(1.6, 2.5, lock), lerp(.6, 0, lock));
    pf.rotation.y = lerp(-.9, -.35, lock);
    const flow = ss(.22, .3, t) * (1 - ss(.82, .9, t));
    const fill = ss(.2, .9, t);
    const h = lerp(.02, 1.05, fill);
    liq.scale.y = h; crema.position.y = GLASS_Y + .17 + h + .03; crema.scale.set(lerp(.86, 1, fill), 1, lerp(.86, 1, fill));
    crema.material.color.setHSL(.07, .55, lerp(.22, .4, fill));
    const surfY = GLASS_Y + .17 + h + .06;
    [[stL, -1], [stR, 1]].forEach(([s, side]) => {
      const top = new V3(side * .27, pf.position.y - .95, pf.position.z);
      const len = Math.max(.01, top.y - surfY);
      s.visible = flow > .02;
      s.scale.set(flow, len, flow);
      s.position.set(lerp(top.x, side * .08, .5), (top.y + surfY) / 2, top.z);
      s.rotation.z = -Math.atan2(top.x - side * .08, len);
    });
    sMat.uniforms.uLight.value = ss(.7, .88, t) * .5; // "blonding" al final
    const drip = ss(.12, .2, t) * (1 - ss(.26, .3, t)) + ss(.86, .9, t) * (1 - ss(.96, 1, t));
    dripsE.visible = drip > 0;
    for (let i = 0; i < 8; i++) {
      const ph = (time * 1.4 + i / 8) % 1, side = i % 2 ? 1 : -1;
      p4.set(side * .3, lerp(pf.position.y - 1.0, surfY, ph * ph), pf.position.z); s4.setScalar(.035 * drip);
      m4.compose(p4, q4, s4); dripsE.setMatrixAt(i, m4);
    }
    dripsE.instanceMatrix.needsUpdate = true;
    steam2.position.y = surfY; steam2.material.uniforms.uAmt.value = ss(.4, .9, t);
  }

  /* =========================================================
     CAPÍTULO 3 · FILTRADO V60
     ========================================================= */
  const c3 = new THREE.Group(); scene.add(c3);
  const V60_Y = .62;
  const v60 = new THREE.Mesh(lathe([[.17, 0], [.2, .04], [1.28, 1.38], [1.4, 1.44], [1.42, 1.5], [1.33, 1.5], [1.22, 1.42], [.13, .07], [.13, 0]], 96), M.ceramic); v60.position.y = V60_Y; c3.add(v60);
  const v60base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .07, 64, 1, true), M.ceramic); v60base.position.y = V60_Y - .03; c3.add(v60base);
  const v60plate = new THREE.Mesh(new THREE.RingGeometry(.15, 1.0, 64), M.ceramic); v60plate.rotation.x = -Math.PI / 2; v60plate.position.y = V60_Y; c3.add(v60plate);
  const paperGeo = lathe([[.1, .1], [1.22, 1.42], [1.36, 1.7]], 120);
  { const a = paperGeo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const ang = Math.atan2(a[i + 2], a[i]), y = a[i + 1], f = 1 + Math.sin(ang * 26) * .025 * (y / 1.7); a[i] *= f; a[i + 2] *= f; } paperGeo.computeVertexNormals(); }
  const paper = new THREE.Mesh(paperGeo, M.paper); paper.position.y = V60_Y + .02; c3.add(paper);
  const bedGeo = new THREE.CircleGeometry(.84, 64); bedGeo.rotateX(-Math.PI / 2);
  const bedBase = bedGeo.attributes.position.array.slice();
  const bed = new THREE.Mesh(bedGeo, M.bed); bed.position.y = V60_Y + .9; c3.add(bed);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(.86, 64), M.coffee); pool.rotation.x = -Math.PI / 2; c3.add(pool);
  const SERV_Y = -1.32;
  const servProf = [[.62, 1.84], [.56, 1.76], [.58, 1.6], [.8, 1.3], [.95, .7], [.9, .3], [.7, .05], [0, .05]];
  const server = new THREE.Mesh(lathe([[0, 0], [.75, 0], [.95, .3], [1.0, .7], [.85, 1.3], [.62, 1.6], [.6, 1.76], [.67, 1.84], ...servProf], 72), M.glass); server.position.y = SERV_Y; c3.add(server);
  let servLiq = null, lastLvl = -1;
  function setServer(level) { // nivel 0..1.15
    if (Math.abs(level - lastLvl) < .008) return; lastLvl = level;
    const inner = servProf.slice().reverse().map(([r, y]) => [r - .02, y]).filter(([, y]) => y <= level + .05);
    const rAt = y => { const pr = servProf.slice().reverse(); for (let i = 0; i < pr.length - 1; i++) { const [r0, y0] = pr[i], [r1, y1] = pr[i + 1]; if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)) - .02; } return .5; };
    const pts = [[0, .06], ...inner.filter(([, y]) => y > .06), [rAt(level + .06), level + .06], [0, level + .06]];
    if (servLiq) { servLiq.geometry.dispose(); c3.remove(servLiq); }
    servLiq = new THREE.Mesh(lathe(pts, 56), M.filter); servLiq.position.y = SERV_Y; c3.add(servLiq);
  }
  // pava cuello de cisne (negra, como la del local)
  const kettle = new THREE.Group(); c3.add(kettle);
  const kBody = new THREE.Mesh(lathe([[0, 0], [1.05, 0], [1.12, .15], [1.12, 1.2], [.95, 1.45], [.45, 1.55], [.12, 1.62], [0, 1.66]], 64), M.black); kBody.position.set(-4.1, 2.0, -.2); kBody.rotation.z = -.42; kettle.add(kBody);
  const gooseCurve = new THREE.CatmullRomCurve3([new V3(-3.25, 2.25, -.1), new V3(-2.75, 2.9, -.05), new V3(-2.2, 3.55, 0), new V3(-1.35, 3.62, 0), new V3(-.78, 3.28, 0)]);
  kettle.add(new THREE.Mesh(new THREE.TubeGeometry(gooseCurve, 64, .075, 16), M.black));
  const kTip = new V3(-.74, 3.24, 0);
  const water = new THREE.Mesh(new THREE.BufferGeometry(), M.water); c3.add(water);
  const wMat2 = streamMat('#ffffff', '#cfe6ff', 30, 14); wMat2.transparent = true;
  const drips3 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.drop, 10); c3.add(drips3);
  const steam3 = makeSteam(50, 1.2); c3.add(steam3);
  c3.add(contact(1.6, SERV_Y + .01, .7));
  function updateFil(t, time) {
    const pour = ss(.06, .14, t) * (1 - ss(.78, .86, t));
    const bloom = ss(.12, .3, t) * (1 - ss(.4, .7, t) * .6);
    // cama de café: burbujeo (bloom)
    const a = bedGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { const x = bedBase[i], z = bedBase[i + 2]; a[i + 1] = (Math.sin(x * 9 + time * 2) * Math.cos(z * 8 - time * 1.7) * .03 + .08) * bloom; }
    bedGeo.attributes.position.needsUpdate = true; bedGeo.computeVertexNormals();
    bed.position.y = V60_Y + lerp(.82, .95, bloom);
    const wl = ss(.15, .55, t) * (1 - ss(.8, 1, t));
    pool.visible = wl > .02; pool.position.y = V60_Y + .9 + wl * .3; pool.scale.setScalar(lerp(.9, 1.15, wl));
    // chorro de agua en espiral
    const ang = time * 2.4, rr = .32 + Math.sin(time * .7) * .12;
    const end = new V3(Math.cos(ang) * rr, V60_Y + .95, Math.sin(ang) * rr * .6);
    water.visible = pour > .02;
    if (water.visible) {
      const ctrl = new V3(kTip.x + .35, kTip.y - .05, 0);
      const curve = new THREE.QuadraticBezierCurve3(kTip, ctrl, end);
      water.geometry.dispose(); water.geometry = new THREE.TubeGeometry(curve, 36, .028 * pour + .004, 10);
    }
    kettle.rotation.z = lerp(.08, 0, pour); kettle.position.y = lerp(.25, 0, pour);
    // gotas cayendo a la jarra
    const drip = ss(.22, .3, t) * (1 - ss(.9, .98, t));
    const level = lerp(.08, 1.1, ss(.22, .95, t));
    setServer(level);
    const top = V60_Y - .02, bottom = SERV_Y + level + .06;
    for (let i = 0; i < 10; i++) {
      const ph = (time * 1.15 + i / 10) % 1;
      p4.set(0, lerp(top, bottom, ph * ph), 0); s4.set(.045 * drip, .065 * drip * (1 + ph), .045 * drip);
      m4.compose(p4, q4, s4); drips3.setMatrixAt(i, m4);
    }
    drips3.instanceMatrix.needsUpdate = true;
    steam3.position.y = V60_Y + 1.4; steam3.material.uniforms.uAmt.value = pour * .8;
  }

  /* =========================================================
     CAPÍTULO 4 · LATTE ART (taza amarilla, rosetta en vivo)
     ========================================================= */
  const c4 = new THREE.Group(); scene.add(c4);
  const CUP_S = 1.35;
  const cupG = new THREE.Group(); cupG.scale.setScalar(CUP_S); cupG.position.y = -1.2; c4.add(cupG);
  cupG.add(new THREE.Mesh(lathe([[0, 0], [.55, 0], [.6, .05], [.9, .35], [1.12, .75], [1.2, 1.0], [1.23, 1.06], [1.17, 1.06], [1.1, .82], [.88, .44], [.5, .14], [0, .14]], 96), M.yellow));
  const cupHandle = new THREE.Mesh(new THREE.TorusGeometry(.3, .075, 16, 40, Math.PI * 1.25), M.yellow); cupHandle.position.set(1.25, .6, 0); cupHandle.rotation.z = -Math.PI * .62; cupG.add(cupHandle);
  const saucer = new THREE.Mesh(lathe([[0, -.02], [1.0, -.02], [1.65, .1], [1.85, .2], [1.8, .23], [1.6, .15], [1.0, .05], [0, .05]], 96), M.yellow); cupG.add(saucer);
  cupG.add(contact(2.2, -.03, .7));
  // superficie con textura dibujada
  const LA = 768, lc = document.createElement('canvas'); lc.width = lc.height = LA;
  const lx = lc.getContext('2d');
  const baseC = document.createElement('canvas'); baseC.width = baseC.height = LA;
  { const b = baseC.getContext('2d'), g = b.createRadialGradient(LA / 2, LA / 2, 0, LA / 2, LA / 2, LA / 2);
    g.addColorStop(0, '#8a4b1e'); g.addColorStop(.55, '#a3612a'); g.addColorStop(.85, '#6e3812'); g.addColorStop(1, '#3d1a07');
    b.fillStyle = g; b.fillRect(0, 0, LA, LA);
    for (let i = 0; i < 9000; i++) { const r = Math.random() * LA / 2, a = Math.random() * 6.283; b.fillStyle = `rgba(${Math.random() < .5 ? '255,220,170' : '40,15,4'},${Math.random() * .12})`; b.fillRect(LA / 2 + Math.cos(a) * r, LA / 2 + Math.sin(a) * r, 2, 2); } }
  const latteTex = new THREE.CanvasTexture(lc); latteTex.colorSpace = THREE.SRGBColorSpace; latteTex.anisotropy = 4;
  const surfL = new THREE.Mesh(new THREE.CircleGeometry(1.115, 96), new THREE.MeshPhysicalMaterial({ map: latteTex, roughness: .32, clearcoat: .7, clearcoatRoughness: .2 }));
  surfL.rotation.x = -Math.PI / 2; surfL.position.y = .93; cupG.add(surfL);
  // jarra de leche (acero) con pico
  const pitcher = new THREE.Group(); c4.add(pitcher);
  const pGeo = lathe([[0, 0], [.55, 0], [.6, .05], [.63, .8], [.58, 1.25], [.6, 1.38], [.56, 1.38], [.54, 1.25], [.59, .8], [.57, .06], [0, .06]], 64);
  { const a = pGeo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const y = a[i + 1]; if (y > 1.05) { const ang = Math.atan2(a[i + 2], a[i]), w = Math.max(0, Math.cos(ang)) ** 6, e = (y - 1.05) / .33; a[i] += w * e * .32; a[i + 1] += w * e * .1; } } pGeo.computeVertexNormals(); }
  pitcher.add(new THREE.Mesh(pGeo, M.metal));
  const pHandle = new THREE.Mesh(new THREE.TorusGeometry(.32, .06, 12, 32, Math.PI), M.metal); pHandle.position.set(-.62, .7, 0); pHandle.rotation.z = Math.PI / 2; pitcher.add(pHandle);
  const milkMesh = new THREE.Mesh(new THREE.BufferGeometry(), M.milk); c4.add(milkMesh);
  const steam4 = makeSteam(60, 1.6); c4.add(steam4);

  const R = LA / 2 * .96, CX = LA / 2, CY = LA / 2;
  function leafPath(cx, y, w, h, pinch) {
    lx.beginPath();
    lx.moveTo(cx - w, y);
    lx.quadraticCurveTo(cx - w * .55, y - h * 1.15, cx, y - h - pinch * h * .1);
    lx.quadraticCurveTo(cx + w * .55, y - h * 1.15, cx + w, y);
    lx.quadraticCurveTo(cx + w * .5, y + h * .35 - pinch * h * .5, cx, y + h * .2 - pinch * h * .95);
    lx.quadraticCurveTo(cx - w * .5, y + h * .35 - pinch * h * .5, cx - w, y);
    lx.closePath();
  }
  let lastQ = -1;
  function drawLatte(q, time) {
    if (Math.abs(q - lastQ) < .0015 && q > 0 && q < 1) return; lastQ = q;
    lx.drawImage(baseC, 0, 0);
    // 1) base: la leche aclara la crema
    const b = ss(.02, .2, q);
    if (b > 0) {
      const g = lx.createRadialGradient(CX, CY + R * .05, 0, CX, CY + R * .05, R * .75 * b);
      g.addColorStop(0, 'rgba(214,160,104,.85)'); g.addColorStop(1, 'rgba(214,160,104,0)');
      lx.fillStyle = g; lx.beginPath(); lx.arc(CX, CY + R * .05, R * .75 * b, 0, 7); lx.fill();
    }
    // 2) hojas de la rosetta (de atrás hacia adelante)
    const N = 9, pinch = ss(.76, .9, q);
    lx.filter = 'blur(1.1px)';
    for (let k = 0; k < N; k++) {
      const appear = ss(.2 + k * .055, .26 + k * .055, q);
      if (appear <= 0) continue;
      const fy = lerp(-.52, .42, k / (N - 1)), w = lerp(.62, .2, k / (N - 1)) * R * (.6 + .4 * appear), h = lerp(.17, .1, k / (N - 1)) * R;
      const push = (1 - appear) * .12 * R;
      const wig = Math.sin(time * 9 + k) * (1 - appear) * .05 * R;
      lx.fillStyle = `rgba(253,247,236,${.25 + .75 * appear})`;
      leafPath(CX + wig, CY + fy * R + push, w, h, pinch);
      lx.fill();
      lx.strokeStyle = `rgba(120,64,26,${.55 * appear})`; lx.lineWidth = 3.2;
      lx.beginPath(); lx.ellipse(CX + wig, CY + fy * R + push + h * .36 - pinch * h * .5, w * .86, h * .5, 0, Math.PI * 1.05, Math.PI * 1.95); lx.stroke();
    }
    lx.filter = 'none';
    // 3) corazón final y tirada (pull-through)
    const hb = ss(.66, .76, q);
    if (hb > 0) {
      const hy = CY + R * .58, s = R * .13 * hb;
      lx.fillStyle = 'rgba(253,247,236,.95)';
      lx.beginPath(); lx.arc(CX - s * .5, hy, s * .62, 0, 7); lx.fill(); lx.beginPath(); lx.arc(CX + s * .5, hy, s * .62, 0, 7); lx.fill();
      lx.beginPath(); lx.moveTo(CX - s * 1.08, hy + s * .1); lx.lineTo(CX, hy - s * 1.15); lx.lineTo(CX + s * 1.08, hy + s * .1); lx.fill();
    }
    if (pinch > 0) {
      const y0 = CY + R * .72, y1 = CY + R * (.72 - 1.42 * pinch);
      lx.strokeStyle = 'rgba(253,247,236,.95)'; lx.lineWidth = 7; lx.lineCap = 'round';
      lx.beginPath(); lx.moveTo(CX, y0); lx.lineTo(CX, y1); lx.stroke();
      lx.strokeStyle = 'rgba(110,58,22,.35)'; lx.lineWidth = 2;
      lx.beginPath(); lx.moveTo(CX - 5, y0); lx.lineTo(CX - 5, y1); lx.moveTo(CX + 5, y0); lx.lineTo(CX + 5, y1); lx.stroke();
    }
    latteTex.needsUpdate = true;
  }
  function updateLat(t, time) {
    const q = t;
    drawLatte(q, time);
    // posición del vertido sobre la taza (coordenadas de la textura → mundo)
    let py, px = 0, hgt, thick;
    if (q < .2) { py = .05; hgt = lerp(2.6, 1.6, q / .2); thick = .045; }
    else if (q < .66) { const f = map(q, .2, .66); py = lerp(-.45, .45, f); px = Math.sin(time * 9) * lerp(.05, .14, f); hgt = .75; thick = .06; }
    else if (q < .76) { py = .58; hgt = .75; thick = .055; }
    else { const f = map(q, .76, .9); py = lerp(.72, -.7, f); hgt = 1.1; thick = .02; }
    const on = q > .02 && q < .9;
    const sx = px * 1.115 * CUP_S, sz = py * 1.115 * CUP_S, sy = cupG.position.y + .93 * CUP_S;
    const lip = new V3(sx + .12, sy + hgt, sz);
    pitcher.scale.setScalar(.72);
    pitcher.rotation.set(0, -.5, on ? -1.12 + (q > .76 ? .18 : 0) : -.3);
    const off = new V3(.92, 1.48, 0).multiplyScalar(.72).applyEuler(pitcher.rotation);
    pitcher.position.copy(lip).sub(off);
    pitcher.visible = q < .97;
    milkMesh.visible = on;
    if (on) {
      const curve = new THREE.QuadraticBezierCurve3(lip, new V3(lip.x + .05, lip.y - .1, lip.z), new V3(sx, sy + .01, sz));
      milkMesh.geometry.dispose(); milkMesh.geometry = new THREE.TubeGeometry(curve, 24, thick, 12);
    }
    steam4.position.y = sy; steam4.material.uniforms.uAmt.value = .5 + ss(.85, 1, q) * .5;
  }

  /* =========================================================
     CÁMARAS, CAPÍTULOS Y BUCLE
     ========================================================= */
  const chapters = [
    { g: c1, update: updateDrop, cam: t => ({ pos: new V3(Math.sin(t * 1.2) * .8, lerp(2.0, 1.3, t), lerp(9.2, 8.2, t)), look: new V3(0, lerp(.45, .2, t), 0), bg: 0x8a4a14 }) },
    { g: c2, update: updateEsp, cam: t => ({ pos: new V3(lerp(2.6, -1.2, t), lerp(2.6, 1.2, ss(0, .5, t)), lerp(9.5, 10.5, t)), look: new V3(.6, lerp(1.6, .7, ss(0, .45, t)), 0), bg: 0x4a2a12 }) },
    { g: c3, update: updateFil, cam: t => ({ pos: new V3(lerp(2.6, .6, t), lerp(2.8, 1.4, t), lerp(10.5, 9.8, t)), look: new V3(-.9, lerp(1.2, .6, t), 0), bg: 0x2a3a44 }) },
    { g: c4, update: updateLat, cam: t => ({ pos: new V3(Math.sin(t * .8) * .8, lerp(7.2, 6.2, t), lerp(5.2, 4.4, t)), look: new V3(.2, -.1, 0), bg: 0x6a3a12 }) }
  ];
  const chapEls = [...sec.querySelectorAll('.lab-chap')], dots = [...sec.querySelectorAll('.lab-dots i')], fade = sec.querySelector('.lab-fade'), bar = sec.querySelector('.lab-bar i');

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true }); resize();

  const clock = new THREE.Clock();
  let ps = 0, time = 0, visible = false, curChap = -1, wasVis = false;
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '100px' }); io.observe(sec);
  const bgCol = new THREE.Color();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible) { wasVis = false; return; }
    time += dt; streamUniforms.uTime.value = time;
    const r = sec.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    if (!wasVis) ps = p; wasVis = true;
    ps = Math.abs(p - ps) < .0005 ? p : lerp(ps, p, 1 - Math.pow(.88, dt * 60));
    const n = chapters.length, i = Math.min(n - 1, Math.floor(ps * n)), t = clamp(ps * n - i);
    chapters.forEach((c, k) => c.g.visible = k === i);
    if (i !== curChap) {
      curChap = i;
      chapEls.forEach((e, k) => e.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      sec.dataset.chap = i;
    }
    const f = Math.min(1, (i === 0 ? 1 : t / .07), (i === n - 1 ? 1 : (1 - t) / .07));
    fade.style.opacity = 1 - clamp(f);
    if (bar) bar.style.transform = `scaleX(${ps})`;
    chapters[i].update(t, time);
    const cm = chapters[i].cam(t);
    const narrow = camera.aspect < 1, k = narrow ? 1 + (1 - camera.aspect) * 1.25 : 1;
    if (!narrow) { const sh = i === 1 || i === 2 ? -.6 : -1.1; cm.look.x += sh; cm.pos.x += sh; }
    camera.position.copy(cm.look).add(cm.pos.clone().sub(cm.look).multiplyScalar(k));
    camera.lookAt(cm.look);
    bgCol.set(cm.bg); backdrop.material.color.lerp(bgCol, .06);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
