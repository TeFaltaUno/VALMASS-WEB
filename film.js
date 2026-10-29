/* VALMASS WEB · "LA PELÍCULA" — 8 escenas 3D cinematográficas manejadas por el scroll.
   Three.js + HDRI de estudio (Poly Haven, CC0) + postproducción: profundidad de campo,
   bloom, grano de película, viñeta y aberración cromática. Sin videos: todo es 3D en tiempo real. */
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const G = window.VALMASS || (window.VALMASS = {});
const sec = document.getElementById('film');
if (sec) start();

function start() {
  /* ---------------- utilidades ---------------- */
  const clamp = (n, a = 0, b = 1) => Math.min(Math.max(n, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b) => clamp((v - a) / (b - a));
  const ss = (a, b, v) => { const t = map(v, a, b); return t * t * (3 - 2 * t); };
  const V2 = THREE.Vector2, V3 = THREE.Vector3;
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const MOBILE = innerWidth <= 900 || matchMedia('(pointer:coarse)').matches;
  const canvas = sec.querySelector('.lab-canvas');
  const progress = f => G.onFilmProgress && G.onFilmProgress(f);

  /* ---------------- renderer + postproducción ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.3 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070504);
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 200);
  scene.add(camera);

  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let bokeh = null;
  if (!MOBILE) { bokeh = new BokehPass(scene, camera, { focus: 8, aperture: .0009, maxblur: .007 }); composer.addPass(bokeh); }
  const bloom = new UnrealBloomPass(new V2(256, 256), MOBILE ? .16 : .3, .55, MOBILE ? .97 : .93);
  composer.addPass(bloom);
  const filmPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: .045 }, uVig: { value: 1 }, uCA: { value: .006 }, uRes: { value: new V2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uGrain,uVig,uCA; uniform vec2 uRes; varying vec2 vUv;
      float rand(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 d=vUv-.5; float r=dot(d,d);
        vec2 off=d*uCA*(.4+r*2.0);
        vec3 c=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
        float v=smoothstep(.95,.18,length(d)*1.35); c*=mix(1.0,v,uVig);
        c+= (rand(vUv*uRes+fract(uTime*7.0))-.5)*uGrain*(1.0-dot(c,vec3(.3))*.5);
        c*=vec3(1.035,1.0,.955);
        gl_FragColor=vec4(c,1.0);
      }`
  });
  composer.addPass(filmPass);
  composer.addPass(new OutputPass());

  /* ---------------- carga: HDRI + texturas ---------------- */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (u, l, t) => progress(l / t * .9);
  const texLoader = new THREE.TextureLoader(manager);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let ready = false;
  new RGBELoader(manager).load('assets/3d/studio.hdr', tex => {
    scene.environment = pmrem.fromEquirectangular(tex).texture; tex.dispose();
  });
  if ('environmentIntensity' in scene) scene.environmentIntensity = .5;
  const woodTex = (n, srgb) => { const t = texLoader.load(`assets/3d/wood_${n}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

  /* ---------------- texturas procedurales ---------------- */
  function canvasTex(w, h, draw, srgb = true, repeat = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, c);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; if (repeat !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.userData.canvas = c; return t;
  }
  // granito negro (como la barra de Valmass)
  const graniteTex = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#0c0c0d'; x.fillRect(0, 0, w, h);
    const cols = ['#1c1c1f', '#2b2b2f', '#3d3d42', '#5c5c62', '#8b8b92', '#3a2e22', '#d7cfc2'];
    for (let i = 0; i < 70000; i++) {
      const k = Math.random(), c = cols[k < .45 ? 0 : k < .7 ? 1 : k < .85 ? 2 : k < .94 ? 3 : k < .975 ? 5 : k < .995 ? 4 : 6];
      x.fillStyle = c; x.globalAlpha = rnd(.4, 1); const s = rnd(.6, 2.6); x.fillRect(rnd(0, w), rnd(0, h), s, s * rnd(.6, 1.4));
    }
  }, true, 7);
  const graniteRough = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '20,20,20' : '160,160,160'},.5)`; x.fillRect(rnd(0, w), rnd(0, h), 2, 2); } }, false, 7);
  // nube suave para vapor y halos
  const softTex = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const cloudTex = canvasTex(256, 256, (x, w) => { for (let i = 0; i < 40; i++) { const r = rnd(20, 70), cx = rnd(60, 196), cy = rnd(60, 196), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); } });
  // crema del espresso: "tiger flecks" en espiral + micro burbujas
  function drawCrema(x, w, h, swirl = 1) {
    const cx = w / 2, cy = h / 2, R = w / 2;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, '#d29b5c'); g.addColorStop(.35, '#bb7a3c'); g.addColorStop(.7, '#9a5622'); g.addColorStop(.92, '#6b3410'); g.addColorStop(1, '#3a1a06');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const r = Math.sqrt(Math.random()) * R * .95, a = Math.random() * 6.283 + r / R * 2.2 * swirl;
      x.save(); x.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.rotate(a + Math.PI / 2 + .5 * swirl);
      x.fillStyle = `rgba(${Math.random() < .7 ? '70,30,8' : '240,200,150'},${rnd(.06, .22)})`;
      x.beginPath(); x.ellipse(0, 0, rnd(1.5, 7), rnd(.5, 1.6), 0, 0, 7); x.fill(); x.restore();
    }
    for (let i = 0; i < 1500; i++) { const r = Math.sqrt(Math.random()) * R * .9, a = Math.random() * 6.283; x.fillStyle = `rgba(255,235,205,${rnd(.05, .25)})`; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd(.4, 1.6), 0, 7); x.fill(); }
  }
  const cremaTex = canvasTex(1024, 1024, (x, w, h) => drawCrema(x, w, h, 1));
  // logo Valmass: cartel negro, letras blancas
  function drawLogo(x, w, h, plate = true) {
    if (plate) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); }
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = `700 ${h * .5}px Outfit, Arial, sans-serif`; x.fillText('valmass', w / 2, h * .6);
    x.font = `500 ${h * .085}px "JetBrains Mono", monospace`;
    const s = 'C A F É   D E   E S P E C I A L I D A D'; x.fillText(s, w / 2, h * .82);
  }
  const logoTex = canvasTex(1024, 320, (x, w, h) => drawLogo(x, w, h));
  const logoEmit = canvasTex(1024, 320, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); drawLogo(x, w, h, false); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    [[logoTex, true], [logoEmit, false]].forEach(([t, p]) => { const c = t.userData.canvas, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); if (!p) { x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); } drawLogo(x, c.width, c.height, p); t.needsUpdate = true; });
  });

  /* ---------------- materiales ---------------- */
  const M = {
    steel: new THREE.MeshPhysicalMaterial({ color: 0xb9b6b0, metalness: 1, roughness: .3, anisotropy: .7, clearcoat: .1 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xd8d8d8, metalness: 1, roughness: .1 }),
    darkSteel: new THREE.MeshPhysicalMaterial({ color: 0x3a3836, metalness: 1, roughness: .35 }),
    machine: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, metalness: .2, roughness: .28, clearcoat: 1, clearcoatRoughness: .08 }),
    wood: new THREE.MeshPhysicalMaterial({ map: woodTex('Diffuse', true), normalMap: woodTex('nor_gl'), roughnessMap: woodTex('Rough'), color: 0xc98a5a, roughness: .9, clearcoat: .5, clearcoatRoughness: .3 }),
    granite: new THREE.MeshPhysicalMaterial({ map: graniteTex, roughnessMap: graniteRough, roughness: .5, clearcoat: .5, clearcoatRoughness: .2, color: 0x5a5a5a, envMapIntensity: .15 }),
    yellow: new THREE.MeshPhysicalMaterial({ color: 0xe0a210, roughness: .3, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .6 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf6f2ea, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .02, thickness: .25, ior: 1.5, side: THREE.DoubleSide, envMapIntensity: 1.3, specularIntensity: 1 }),
    glassT: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .16, roughness: .02, metalness: 0, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false, specularIntensity: 1, clearcoat: 1 }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0xeef8ff, transmission: 1, roughness: .12, thickness: .6, ior: 1.31, envMapIntensity: 1.4 }),
    drop: new THREE.MeshPhysicalMaterial({ color: 0xffb060, transmission: .9, thickness: .6, roughness: 0, ior: 1.36, attenuationColor: new THREE.Color(0xb4560e), attenuationDistance: .55, clearcoat: 1, envMapIntensity: 2.4, emissive: new THREE.Color(0x4a1c00), emissiveIntensity: .45 }),
    crema: new THREE.MeshPhysicalMaterial({ map: cremaTex, bumpMap: cremaTex, bumpScale: 1.5, roughness: .32, clearcoat: .9, clearcoatRoughness: .12 }),
    coffee: new THREE.MeshPhysicalMaterial({ color: 0x1c0a03, roughness: .05, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.6 }),
    filterCoffee: new THREE.MeshPhysicalMaterial({ color: 0x9a3c0c, transmission: .6, thickness: 1.4, roughness: .03, ior: 1.34, attenuationColor: new THREE.Color(0x5a1a04), attenuationDistance: .45 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, thickness: .1, ior: 1.33, envMapIntensity: 1.8 }),
    milk: new THREE.MeshPhysicalMaterial({ color: 0xfbf5ea, roughness: .35, clearcoat: .6, sheen: .6, sheenColor: new THREE.Color(0xffffff) }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf4ecdf, roughness: .95, side: THREE.DoubleSide }),
    grounds: new THREE.MeshStandardMaterial({ color: 0x2e170b, roughness: 1 }),
    bean: new THREE.MeshPhysicalMaterial({ color: 0x4a2412, roughness: .42, clearcoat: .45, clearcoatRoughness: .35, sheen: .5, sheenColor: new THREE.Color(0xc07a34), vertexColors: true }),
    kettle: new THREE.MeshPhysicalMaterial({ color: 0x121212, metalness: .55, roughness: .42, clearcoat: .4 }),
    sign: new THREE.MeshStandardMaterial({ map: logoTex, emissiveMap: logoEmit, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: .35 })
  };

  /* ---------------- helpers de geometría ---------------- */
  const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);
  const mesh = (g, m, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; return o; };
  function beanGeometry(detail = 48) {
    const g = new THREE.SphereGeometry(1, detail, Math.round(detail * .75)), p = g.attributes.position, v = new V3(), cols = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); let { x, y, z } = v;
      x *= .7; z *= .56; if (z > 0) z *= .42;
      const d = x - .09 * Math.sin(y * 2.4), groove = Math.exp(-(d * d) / .006) * Math.pow(Math.max(0, 1 - y * y), .6) * .3;
      if (v.z > 0) z -= groove;
      const n = Math.sin(x * 31 + y * 17) * Math.cos(y * 23 - z * 13) * .008; x += n; z += n;
      p.setXYZ(i, x, y, z);
      const tone = .86 + Math.random() * .12 - groove * 2.4; cols.push(tone, tone * .97, tone * .94);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
  }
  const BEAN = beanGeometry(MOBILE ? 28 : 44);
  // radio interior de una taza según la altura (perfil de lathe)
  const radiusAt = (prof, y) => { for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); } return prof[prof.length - 1][0]; };

  /* ---------------- shader de chorro (espresso / leche / agua) ---------------- */
  const T = { value: 0 };
  function streamMaterial(c1, c2, opts = {}) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: true,
      uniforms: { uTime: T, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) }, uFreq: { value: opts.freq || 34 }, uSpeed: { value: opts.speed || 11 }, uBlond: { value: 0 }, uTop: { value: 0 }, uBot: { value: 0 }, uWob: { value: opts.wob ?? 1 }, uAlpha: { value: opts.alpha ?? 1 } },
      vertexShader: `uniform float uTime,uTop,uBot,uWob; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv=uv; vec3 p=position; p.x+=mix(uBot,uTop,uv.y);
          float w=(1.0-uv.y)*uWob; p.x+=sin(uv.y*26.0+uTime*10.0)*.012*w; p.z+=cos(uv.y*19.0+uTime*8.0)*.01*w;
          p.xz*=1.0+sin(uv.y*40.0-uTime*14.0)*.12*w;
          vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime,uFreq,uSpeed,uBlond,uAlpha; uniform vec3 c1,c2; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float s=.5+.5*sin(vUv.y*uFreq+uTime*uSpeed+sin(vUv.y*9.0+uTime*3.0)*1.8);
          s=smoothstep(.2,.9,s);
          vec3 col=mix(c1,c2,s*.8+uBlond);
          float ndv=abs(dot(normalize(vN),normalize(vV)));
          col*=.55+.6*ndv; col+=pow(1.0-ndv,2.5)*vec3(1.0,.72,.4)*.6;
          col+=pow(max(dot(normalize(vN),normalize(vec3(.5,.7,.6))),0.0),40.0)*1.2;
          gl_FragColor=vec4(col,uAlpha*(.75+.25*ndv));
          #include <colorspace_fragment>
        }`
    });
  }
  function streamMesh(mat, rt = .04, rb = .028) { const g = new THREE.CylinderGeometry(rt, rb, 1, 20, 64, true); g.translate(0, .5, 0); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m; }
  function setStream(m, top, bot, flow) { // top/bottom en coordenadas del grupo padre
    m.visible = flow > .01; if (!m.visible) return;
    m.position.set(0, bot.y, (top.z + bot.z) / 2);
    m.scale.set(flow, Math.max(.001, top.y - bot.y), flow);
    m.material.uniforms.uTop.value = top.x / flow; m.material.uniforms.uBot.value = bot.x / flow;
  }

  /* ---------------- vapor (sprites) ---------------- */
  function makeSteam(n, spread, height = 3) {
    const g = new THREE.Group(); g.userData = { parts: [], amt: 0 };
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: 0xfff4e6 }));
      g.add(s); g.userData.parts.push({ s, seed: Math.random(), x: rnd(-spread, spread), z: rnd(-spread, spread) * .5, sp: rnd(.6, 1.2) });
    }
    g.userData.update = (time, amt) => g.userData.parts.forEach(p => {
      const t = (p.seed + time * .06 * p.sp) % 1;
      p.s.position.set(p.x * (1 + t) + Math.sin(t * 6 + p.seed * 9) * .3 * t, t * height, p.z);
      p.s.scale.setScalar(.6 + t * 2.2); p.s.material.opacity = Math.sin(t * Math.PI) * .09 * amt; p.s.material.rotation = p.seed * 6 + t * 1.5;
    });
    return g;
  }

  /* ---------------- partículas de polvo en la luz ---------------- */
  function makeDust(n, box) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-box, box); pos[i * 3 + 1] = rnd(-box, box); pos[i * 3 + 2] = rnd(-box, box); seed[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: T, uPx: { value: renderer.getPixelRatio() }, uAmt: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime,uPx; varying float vA; void main(){ vec3 p=position; p.y+=sin(uTime*.2+seed*30.0)*.4; p.x+=cos(uTime*.15+seed*20.0)*.4; vA=.4+.6*fract(seed*7.0); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(4.0+6.0*seed)*uPx*6.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uAmt; varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(1.0,.8,.55,smoothstep(.5,0.0,d)*vA*.5*uAmt); }` });
    const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
  }

  /* ---------------- haz de luz volumétrico ---------------- */
  function lightShaft(h, rTop, rBot, color = 0xffd9a0, op = .16) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, 48, 1, true); g.translate(0, -h / 2, 0);
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: new THREE.Color(color) }, uOp: { value: op } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uCol; uniform float uOp; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=pow(abs(dot(vN,vV)),2.0); gl_FragColor=vec4(uCol, e*uOp*smoothstep(0.0,.4,vUv.y)*(.4+.6*vUv.y)); }' });
    return new THREE.Mesh(g, m);
  }

  /* ---------------- escenografía compartida ---------------- */
  const counter = mesh(new THREE.PlaneGeometry(60, 60), M.granite, 0, 0, 0, false); counter.rotation.x = -Math.PI / 2;
  scene.add(counter);
  // fondo con degradé (cambia de color por escena)
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, uniforms: { uA: { value: new THREE.Color(0x3a1c08) }, uB: { value: new THREE.Color(0x050302) }, uTime: T },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.9999,1.0); }',
    fragmentShader: 'uniform vec3 uA,uB; uniform float uTime; varying vec2 vUv; float r(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);} void main(){ float d=length((vUv-vec2(.5,.62))*vec2(1.3,1.0)); vec3 c=mix(uA,uB,smoothstep(0.0,.75,d)); c+=(r(vUv*999.0)-.5)/255.0; gl_FragColor=vec4(c,1.0); }'
  }));
  backdrop.frustumCulled = false; backdrop.renderOrder = -1; scene.add(backdrop);

  // luces
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x0a0604, .35));
  const key = new THREE.SpotLight(0xfff0dc, MOBILE ? 170 : 260, 40, .55, .7, 1.6); key.castShadow = true; key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048); key.shadow.bias = -.0002; key.shadow.radius = 6; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffc56b, 3.2); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x9fc8ff, 1.2); scene.add(rim2);
  const warm = new THREE.PointLight(0xff8a2a, 14, 14, 2); scene.add(warm);

  /* ---------------- MÁQUINA + PORTAFILTRO (compartidos) ---------------- */
  function makePortafilter() {
    const pf = new THREE.Group();
    pf.add(mesh(lathe([[0, -.42], [.85, -.42], [.98, -.3], [1.02, 0], [1.08, .02], [1.08, .1], [.95, .1], [.92, -.3], [0, -.33]]), M.steel));
    const ears = mesh(new THREE.TorusGeometry(1.06, .045, 16, 72), M.steel, 0, .06, 0); ears.rotation.x = Math.PI / 2; pf.add(ears);
    const neck = mesh(new THREE.CylinderGeometry(.19, .22, 1.0, 32), M.steel, 1.45, -.2, 0); neck.rotation.z = Math.PI / 2 + .1; pf.add(neck);
    const ring = mesh(new THREE.CylinderGeometry(.26, .26, .14, 32), M.chrome, 2.0, -.26, 0); ring.rotation.z = Math.PI / 2 + .1; pf.add(ring);
    const handle = mesh(lathe([[0, 0], [.24, 0], [.27, .3], [.25, 1.4], [.29, 2.0], [.3, 2.2], [.2, 2.32], [0, 2.34]], 48), M.wood, 2.05, -.27, 0); handle.rotation.z = -Math.PI / 2 + .1; pf.add(handle);
    pf.add(mesh(new THREE.CylinderGeometry(.24, .3, .26, 32), M.steel, 0, -.54, 0));
    const sL = mesh(new THREE.CylinderGeometry(.065, .045, .34, 24), M.chrome, -.17, -.8, 0), sR = sL.clone();
    sL.rotation.z = -.32; sR.position.x = .17; sR.rotation.z = .32; pf.add(sL, sR);
    return pf;
  }
  function makeMachine() {
    const m = new THREE.Group();
    m.add(mesh(new RoundedBoxGeometry(9, 3.6, 4.2, 8, .3), M.machine, 0, 5.75, -1.5));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), M.sign); plate.position.set(0, 6.25, .62); m.add(plate);
    const trim = mesh(new THREE.BoxGeometry(9.02, .08, .02), M.chrome, 0, 4.0, .61, false); m.add(trim);
    m.add(mesh(lathe([[0, 0], [1.15, 0], [1.22, .12], [1.18, .5], [.9, .62], [.9, 1.05], [0, 1.05]], 72), M.steel, 0, 2.95, 0));
    m.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, .06, 64), M.darkSteel, 0, 2.93, 0, false));
    // bandeja y rejilla
    m.add(mesh(new RoundedBoxGeometry(6.4, .3, 3.4, 4, .08), M.darkSteel, 0, .15, .2));
    const barG = new THREE.BoxGeometry(.07, .05, 3.0), bars = new THREE.InstancedMesh(barG, M.steel, 34), o = new THREE.Object3D();
    for (let i = 0; i < 34; i++) { o.position.set(-3.0 + i * .182, .32, .2); o.updateMatrix(); bars.setMatrixAt(i, o.matrix); }
    bars.receiveShadow = true; m.add(bars);
    return m;
  }
  // taza amarilla de espresso con platito
  const ESP_IN = [[.83, 1.0], [.8, .9], [.72, .6], [.56, .25], [.38, .12], [0, .12]].reverse();
  function makeEspressoCup() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [.42, 0], [.48, .04], [.62, .25], [.78, .6], [.86, .92], [.88, 1.0], [.85, 1.03], [.83, 1.0], [.8, .9], [.72, .6], [.56, .25], [.38, .12], [0, .12]]), M.yellow));
    const h = mesh(new THREE.TorusGeometry(.24, .06, 16, 40, Math.PI * 1.3), M.yellow, .9, .55, 0); h.rotation.z = -Math.PI * .65; g.add(h);
    const sau = mesh(lathe([[0, -.1], [.8, -.1], [1.45, .02], [1.6, .1], [1.55, .13], [1.4, .06], [.82, -.04], [0, -.04]]), M.yellow); g.add(sau);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 96), M.crema); surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true; g.add(surf);
    g.userData.setLevel = l => { const y = lerp(.13, .9, l); surf.position.y = y; surf.scale.setScalar(radiusAt(ESP_IN, y) - .01); surf.visible = l > .01; };
    g.userData.surf = surf;
    return g;
  }

  /* =========================================================
     ESCENA 1 · EL GRANO — lluvia de granos en un haz de luz
     ========================================================= */
  const S1 = new THREE.Group(); scene.add(S1);
  const NB = MOBILE ? 110 : 220;
  const beans = new THREE.InstancedMesh(BEAN, M.bean, NB); beans.castShadow = true; beans.receiveShadow = true; S1.add(beans);
  const bd = Array.from({ length: NB }, () => ({ x: rnd(-2.4, 2.4), z: rnd(-2.2, 2.2), y0: rnd(1, 22), v: rnd(.7, 1.3), s: rnd(.13, .2), r: new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)), w: new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)) }));
  const pileN = MOBILE ? 60 : 130, pile = new THREE.InstancedMesh(BEAN, M.bean, pileN); pile.castShadow = true; pile.receiveShadow = true; S1.add(pile);
  { const o = new THREE.Object3D(); for (let i = 0; i < pileN; i++) { const r = Math.sqrt(Math.random()) * 2.2, a = rnd(0, 6.28), h = Math.max(0, .9 - r * .4) * Math.random(); o.position.set(Math.cos(a) * r, .1 + h, Math.sin(a) * r); o.rotation.set(rnd(-1.6, -1.2) + rnd(-.6, .6), rnd(0, 6), rnd(-.4, .4)); o.scale.setScalar(rnd(.14, .19)); o.updateMatrix(); pile.setMatrixAt(i, o.matrix); } }
  const shaft1 = lightShaft(16, .6, 3.6, 0xffd29a, .22); shaft1.position.set(0, 16, 0); S1.add(shaft1);
  const dust1 = makeDust(500, 6); dust1.position.y = 6; S1.add(dust1);
  const o4 = new THREE.Object3D();
  function upd1(t, time) {
    for (let i = 0; i < NB; i++) {
      const b = bd[i];
      let y = b.y0 - t * 26 * b.v - time * .05;
      y = ((y % 22) + 22) % 22 + .6;
      o4.position.set(b.x + Math.sin(time * .3 + i) * .05, y, b.z);
      o4.rotation.set(b.r.x + t * 9 * b.w.x + time * .2 * b.w.x, b.r.y + t * 9 * b.w.y, b.r.z + t * 7 * b.w.z);
      o4.scale.setScalar(b.s); o4.updateMatrix(); beans.setMatrixAt(i, o4.matrix);
    }
    beans.instanceMatrix.needsUpdate = true;
  }
  const cam1 = t => ({ pos: new V3(Math.sin(t * 2) * 2.2, lerp(15, 2.6, ss(0, 1, t)), lerp(7.5, 8.2, t)), look: new V3(0, lerp(13.5, .8, ss(0, 1, t)), 0), focus: null, bg: [0x4a2408, 0x050302], key: [new V3(0, 18, 1), new V3(0, 0, 0)], rim: new V3(-4, 6, -6), warm: new V3(2, 2, 3) });

  /* =========================================================
     ESCENA 2 · MOLIENDA Y TAMPEO
     ========================================================= */
  const S2 = new THREE.Group(); scene.add(S2);
  const pf2 = makePortafilter(); pf2.position.set(0, .58, 0); pf2.rotation.y = -.5; S2.add(pf2);
  const grinder = new THREE.Group(); S2.add(grinder);
  grinder.add(mesh(new RoundedBoxGeometry(3.2, 2.6, 3.2, 6, .3), M.machine, 0, 7.4, -.6));
  grinder.add(mesh(new THREE.CylinderGeometry(.35, .5, .9, 32), M.darkSteel, 0, 5.9, 0));
  const moundGeo = new THREE.RingGeometry(.0001, .9, 64, 20); moundGeo.rotateX(-Math.PI / 2);
  const moundBase = moundGeo.attributes.position.array.slice();
  const mound = mesh(moundGeo, M.grounds); pf2.add(mound);
  const nG = MOBILE ? 900 : 2200;
  const gGeo = new THREE.BufferGeometry(), gSeed = new Float32Array(nG * 3);
  for (let i = 0; i < nG; i++) { gSeed[i * 3] = Math.random(); gSeed[i * 3 + 1] = Math.random(); gSeed[i * 3 + 2] = Math.random(); }
  gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nG * 3), 3)); gGeo.setAttribute('seed', new THREE.BufferAttribute(gSeed, 3));
  const groundsPts = new THREE.Points(gGeo, new THREE.ShaderMaterial({
    transparent: true, uniforms: { uTime: T, uFlow: { value: 0 }, uTop: { value: 5.4 }, uBot: { value: .5 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute vec3 seed; uniform float uTime,uFlow,uTop,uBot,uPx; varying float vS; void main(){ float t=fract(seed.x+uTime*(.55+seed.y*.3)); float y=mix(uTop,uBot,t*t); float r=seed.z*.18+t*.25*seed.y; float a=seed.y*40.0+uTime; vec3 p=vec3(cos(a)*r,y,sin(a)*r); vS=seed.z; vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(1.5+2.5*seed.z)*uPx*10.0/-mv.z*step(.001,uFlow)*step(seed.y,uFlow); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vS; void main(){ vec2 c=gl_PointCoord-.5; if(dot(c,c)>.25) discard; vec3 col=mix(vec3(.13,.06,.02),vec3(.32,.17,.08),vS); col*=1.0-length(c)*.8; gl_FragColor=vec4(col,1.0);
    #include <colorspace_fragment>
    }` }));
  groundsPts.frustumCulled = false; S2.add(groundsPts);
  const tamper = new THREE.Group(); S2.add(tamper);
  tamper.add(mesh(new THREE.CylinderGeometry(.86, .86, .3, 64), M.chrome, 0, .15, 0));
  tamper.add(mesh(lathe([[0, 0], [.3, 0], [.22, .3], [.2, .7], [.42, 1.2], [.46, 1.5], [.3, 1.75], [0, 1.8]], 48), M.wood, 0, .3, 0));
  const dust2 = makeDust(250, 4); dust2.position.y = 3; S2.add(dust2);
  function upd2(t, time) {
    const fill = ss(.05, .55, t), tamp = ss(.58, .78, t), lift = ss(.84, 1, t);
    groundsPts.material.uniforms.uFlow.value = fill > .01 && fill < .98 ? 1 : 0;
    const a = moundGeo.attributes.position.array, H = lerp(.02, .5, fill) * (1 - tamp * .75);
    for (let i = 0; i < a.length; i += 3) {
      const x = moundBase[i], z = moundBase[i + 2], r = Math.hypot(x, z) / .9;
      const dome = Math.pow(Math.max(0, 1 - r * r), .7) * H * (1 - tamp) + H * tamp * .25;
      a[i + 1] = -.3 + lerp(.0, .32, fill) * (1 - tamp * .12) + dome + Math.sin(x * 40 + z * 30) * .008 * (1 - tamp);
    }
    moundGeo.attributes.position.needsUpdate = true; moundGeo.computeVertexNormals();
    mound.visible = fill > .01;
    const ty = lerp(4.5, .62 + .06, tamp) + lift * 4;
    tamper.position.set(0, ty, 0); tamper.rotation.y = tamp * .6;
  }
  const cam2 = t => ({ pos: new V3(lerp(-4.2, 3.6, t), lerp(6.2, 4.4, t), lerp(5.6, 6.4, t)), look: new V3(0, lerp(1.6, .8, t), 0), focus: null, bg: [0x2a1a10, 0x050403], key: [new V3(1, 12, 3), new V3(0, 0, 0)], rim: new V3(-5, 5, -5), warm: new V3(-2, 2, 3) });

  /* =========================================================
     ESCENA 3 · EXTRACCIÓN — del portafiltro a la taza amarilla
     ========================================================= */
  const S3 = new THREE.Group(); scene.add(S3);
  S3.add(makeMachine());
  const pf3 = makePortafilter(); S3.add(pf3);
  const cup3 = makeEspressoCup(); cup3.position.set(0, .44, .3); S3.add(cup3);
  const smat = streamMaterial('#2a0f04', '#d08436');
  const stL = streamMesh(smat), stR = streamMesh(smat.clone()); stR.material.uniforms.uTime = T; S3.add(stL, stR);
  const drips3 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), M.drop, 10); S3.add(drips3);
  const steam3 = makeSteam(16, .5, 3.5); S3.add(steam3);
  const dust3 = makeDust(260, 5); dust3.position.y = 3; S3.add(dust3);
  function upd3(t, time) {
    const lock = ss(0, .14, t);
    pf3.position.set(0, lerp(2.1, 2.82, lock), lerp(.9, 0, lock)); pf3.rotation.y = lerp(-1.0, -.42, lock);
    const flow = ss(.2, .3, t) * (1 - ss(.82, .9, t)), fill = ss(.2, .9, t);
    cup3.userData.setLevel(fill);
    cup3.userData.surf.rotation.z = time * .05 + (1 - fill) * 2;
    const surfY = cup3.position.y + lerp(.13, .9, fill);
    smat.uniforms.uBlond.value = stR.material.uniforms.uBlond.value = ss(.7, .88, t) * .45;
    const sy = pf3.position.y - .97;
    setStream(stL, new V3(-.2, sy, pf3.position.z), new V3(-.05, surfY, .3), flow);
    setStream(stR, new V3(.2, sy, pf3.position.z), new V3(.05, surfY, .3), flow);
    const drip = ss(.12, .2, t) * (1 - ss(.27, .31, t)) + ss(.86, .9, t) * (1 - ss(.97, 1, t));
    for (let i = 0; i < 10; i++) {
      const ph = (time * 1.3 + i / 10) % 1, side = i % 2 ? 1 : -1;
      o4.position.set(side * .2, lerp(sy - .05, surfY, ph * ph), pf3.position.z * (1 - ph) + .3 * ph); o4.rotation.set(0, 0, 0); o4.scale.set(.04 * drip, .06 * drip, .04 * drip); o4.updateMatrix(); drips3.setMatrixAt(i, o4.matrix);
    }
    drips3.instanceMatrix.needsUpdate = true;
    steam3.position.set(0, surfY, .3); steam3.userData.update(time, ss(.35, .9, t));
  }
  const cam3 = t => {
    const a = ss(0, .35, t), b = ss(.35, 1, t);
    return { pos: new V3(lerp(5.5, -2.4, a) + b * 1.8, lerp(5.6, 1.9, a) + b * .2, lerp(13, 6.0, a) - b * 1.4), look: new V3(0, lerp(4.4, 1.5, a) - b * .4, lerp(0, .3, a)), focus: null, bg: [0x3a200c, 0x040302], key: [new V3(2.5, 9, 6), new V3(0, 1, .3)], rim: new V3(-6, 4, -4), warm: new V3(0, 1.4, 3) };
  };

  /* =========================================================
     ESCENA 4 · LA GOTA — macro en cámara lenta
     ========================================================= */
  const S4 = new THREE.Group(); scene.add(S4);
  const SP_Y = 3.7, SU_Y = .9;
  const pf4 = makePortafilter(); pf4.position.set(0, SP_Y + .97, 0); pf4.rotation.y = -.42; S4.add(pf4);
  const cup4 = makeEspressoCup(); cup4.position.set(0, .22, 0); cup4.scale.setScalar(2.2); S4.add(cup4); cup4.userData.setLevel(1); cup4.userData.surf.visible = false;
  const surfR = (radiusAt(ESP_IN, .9) - .01) * 2.2;
  const rGeo = new THREE.RingGeometry(.0001, surfR, MOBILE ? 120 : 200, MOBILE ? 50 : 90); rGeo.rotateX(-Math.PI / 2);
  { const uv = rGeo.attributes.uv, p = rGeo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / surfR / 2 + .5, -p.getZ(i) / surfR / 2 + .5); }
  const rBase = rGeo.attributes.position.array.slice();
  const surf4 = mesh(rGeo, M.crema, 0, .22 + SU_Y * 2.2 - .01, 0, false); S4.add(surf4);
  const SURF4 = surf4.position.y;
  const dropGeo = new THREE.SphereGeometry(1, 64, 48), dropBase = dropGeo.attributes.position.array.slice();
  const drop = new THREE.Mesh(dropGeo, M.drop); S4.add(drop);
  const drop2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), M.drop); S4.add(drop2);
  const NC = 30, crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.drop, NC); S4.add(crown);
  const crownSeed = Array.from({ length: NC }, (_, i) => ({ a: i / NC * 6.283 + rnd(0, .2), v: rnd(1.2, 2.1), u: rnd(2.0, 3.4), s: rnd(.022, .05) }));
  const jet = mesh(new THREE.CylinderGeometry(.05, .15, 1, 24), M.drop, 0, 0, 0, false); S4.add(jet);
  function shapeDrop(k, neck) {
    const a = dropGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { const x = dropBase[i], y = dropBase[i + 1], z = dropBase[i + 2], r = 1 - neck * Math.pow(Math.max(0, y), 1.6) * .72; a[i] = x * r; a[i + 1] = y > 0 ? y * k : y * (1 + (k - 1) * .25); a[i + 2] = z * r; }
    dropGeo.attributes.position.needsUpdate = true; dropGeo.computeVertexNormals();
  }
  function upd4(t, time) {
    const u = (t * 2) % 1, R = .2, TIP = SP_Y - .03;
    let rt = -1; drop.visible = true; drop2.visible = false; jet.visible = false; crown.visible = false;
    if (u < .42) { const f = ss(0, .42, u), s = lerp(.06, R, f), k = lerp(1.1, 2.1, ss(.15, .42, u)); shapeDrop(k, ss(.1, .42, u)); drop.scale.setScalar(s); drop.position.set(-.17, TIP - s * .8 - (k - 1) * s * .2, 0); }
    else if (u < .64) { const f = map(u, .42, .64); shapeDrop(1 + .9 * Math.exp(-f * 6) + Math.exp(-f * 4) * Math.sin(f * 30) * .12, Math.exp(-f * 9)); drop.scale.setScalar(R); drop.position.set(-.17 * (1 - f), lerp(TIP - R, SURF4 + R * .4, f * f), 0); }
    else {
      drop.visible = false; rt = map(u, .64, 1); const tt = rt * .9; crown.visible = true;
      crownSeed.forEach((c, i) => { const y = SURF4 + c.u * tt - 4.4 * tt * tt, rr = .12 + c.v * tt; o4.position.set(Math.cos(c.a) * rr, Math.max(y, SURF4 - .2), Math.sin(c.a) * rr); o4.rotation.set(0, 0, 0); o4.scale.setScalar(y > SURF4 ? c.s * (1 - rt * .4) : 0); o4.updateMatrix(); crown.setMatrixAt(i, o4.matrix); });
      crown.instanceMatrix.needsUpdate = true;
      const jh = Math.sin(Math.PI * map(rt, .08, .6)) * 1.1; jet.visible = jh > .01; jet.scale.set(1, Math.max(jh, .001), 1); jet.position.y = SURF4 + jh / 2;
      const r2 = map(rt, .35, .85); if (r2 > 0 && r2 < 1) { drop2.visible = true; drop2.scale.setScalar(.08); drop2.position.y = SURF4 + 1.1 + 1.5 * r2 - 5.6 * r2 * r2; if (drop2.position.y < SURF4) drop2.visible = false; }
    }
    const a = rGeo.attributes.position.array, front = rt * 3.4;
    for (let i = 0; i < a.length; i += 3) {
      const x = rBase[i], z = rBase[i + 2], r = Math.hypot(x, z);
      let h = Math.sin(x * 1.7 + time * .8) * Math.cos(z * 1.3 + time * .6) * .01;
      if (rt > 0 && rt < 1) { const d = r - front, env = Math.exp(-d * d * 2.4) * Math.exp(-rt * 2.3); h += Math.sin(d * 14) * .1 * env; h -= Math.exp(-r * r * 30) * .2 * Math.max(0, 1 - rt * 6); }
      a[i + 1] = h * Math.min(1, (surfR - r) * 4);
    }
    rGeo.attributes.position.needsUpdate = true; rGeo.computeVertexNormals();
  }
  const cam4 = t => ({ pos: new V3(Math.sin(t * 1.4) * 1.0, lerp(5.0, 4.4, t), lerp(6.2, 5.4, t)), look: new V3(0, lerp(2.9, 2.5, t), 0), focus: 'drop', bg: [0x7a3a10, 0x0a0503], key: [new V3(2, 9, 4), new V3(0, 2, 0)], rim: new V3(-3, 4, -6), warm: new V3(0, 1, 2.5) });

  /* =========================================================
     ESCENA 5 · LATTE ART — la rosetta en la taza amarilla
     ========================================================= */
  const S5 = new THREE.Group(); scene.add(S5);
  const LAT_IN = [[1.17, 1.06], [1.1, .82], [.88, .44], [.5, .14], [0, .14]].reverse();
  function makeLatteCup(tex) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [.55, 0], [.6, .05], [.9, .35], [1.12, .75], [1.2, 1.0], [1.23, 1.06], [1.2, 1.09], [1.17, 1.06], [1.1, .82], [.88, .44], [.5, .14], [0, .14]]), M.yellow));
    const hd = mesh(new THREE.TorusGeometry(.3, .075, 16, 40, Math.PI * 1.25), M.yellow, 1.25, .6, 0); hd.rotation.z = -Math.PI * .62; g.add(hd);
    g.add(mesh(lathe([[0, -.06], [1.0, -.06], [1.7, .08], [1.9, .18], [1.85, .21], [1.65, .13], [1.0, .02], [0, .02]]), M.yellow));
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: tex, bumpScale: 2.2, roughness: .3, clearcoat: .8, clearcoatRoughness: .15 });
    const s = new THREE.Mesh(new THREE.CircleGeometry(radiusAt(LAT_IN, .95) - .01, 128), mat); s.rotation.x = -Math.PI / 2; s.position.y = .95; s.receiveShadow = true; g.add(s);
    return g;
  }
  const LA = MOBILE ? 768 : 1024;
  const baseCrema = document.createElement('canvas'); baseCrema.width = baseCrema.height = LA; drawCrema(baseCrema.getContext('2d'), LA, LA, .4);
  const latteTex = canvasTex(LA, LA, x => x.drawImage(baseCrema, 0, 0));
  const lx = latteTex.userData.canvas.getContext('2d');
  const cup5 = makeLatteCup(latteTex); cup5.scale.setScalar(1.5); cup5.position.y = .09; S5.add(cup5);
  const pitcher = new THREE.Group(); S5.add(pitcher);
  const pGeo = lathe([[0, 0], [.55, 0], [.6, .05], [.63, .8], [.58, 1.25], [.6, 1.38], [.56, 1.38], [.54, 1.25], [.59, .8], [.57, .06], [0, .06]], 72);
  { const a = pGeo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const y = a[i + 1]; if (y > 1.05) { const ang = Math.atan2(a[i + 2], a[i]), w = Math.max(0, Math.cos(ang)) ** 6, e = (y - 1.05) / .33; a[i] += w * e * .34; a[i + 1] += w * e * .1; } } pGeo.computeVertexNormals(); }
  pitcher.add(mesh(pGeo, M.steel));
  const ph = mesh(new THREE.TorusGeometry(.32, .06, 14, 32, Math.PI), M.steel, -.62, .7, 0); ph.rotation.z = Math.PI / 2; pitcher.add(ph);
  const milkMat = streamMaterial('#e9dccb', '#fffaf2', { freq: 14, speed: 6, wob: .6 });
  const milk = streamMesh(milkMat, .07, .05); S5.add(milk);
  const steam5 = makeSteam(14, .9, 3); S5.add(steam5);
  const R5 = LA / 2 * .96, C5 = LA / 2;
  function leaf(x, cx, y, w, h, pinch) {
    x.beginPath(); x.moveTo(cx - w, y);
    x.quadraticCurveTo(cx - w * .55, y - h * 1.15, cx, y - h - pinch * h * .1); x.quadraticCurveTo(cx + w * .55, y - h * 1.15, cx + w, y);
    x.quadraticCurveTo(cx + w * .5, y + h * .35 - pinch * h * .5, cx, y + h * .2 - pinch * h * .95); x.quadraticCurveTo(cx - w * .5, y + h * .35 - pinch * h * .5, cx - w, y); x.closePath();
  }
  function drawRosetta(q, time, ctx = lx) {
    ctx.drawImage(baseCrema, 0, 0);
    const b = ss(.02, .2, q);
    if (b > 0) { const g = ctx.createRadialGradient(C5, C5 + R5 * .05, 0, C5, C5 + R5 * .05, R5 * .78 * b); g.addColorStop(0, 'rgba(222,172,118,.9)'); g.addColorStop(1, 'rgba(222,172,118,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C5, C5 + R5 * .05, R5 * .78 * b, 0, 7); ctx.fill(); }
    const N = 10, pinch = ss(.76, .9, q);
    ctx.filter = 'blur(1.4px)';
    for (let k = 0; k < N; k++) {
      const ap = ss(.2 + k * .05, .26 + k * .05, q); if (ap <= 0) continue;
      const f = k / (N - 1), fy = lerp(-.55, .42, f), w = lerp(.64, .2, f) * R5 * (.6 + .4 * ap), h = lerp(.16, .095, f) * R5, push = (1 - ap) * .12 * R5, wig = Math.sin(time * 9 + k) * (1 - ap) * .05 * R5;
      const yy = C5 + fy * R5 + push;
      const gr = ctx.createLinearGradient(0, yy - h, 0, yy + h * .4); gr.addColorStop(0, `rgba(255,250,242,${.3 + .7 * ap})`); gr.addColorStop(1, `rgba(244,230,210,${.3 + .7 * ap})`);
      ctx.fillStyle = gr; leaf(ctx, C5 + wig, yy, w, h, pinch); ctx.fill();
      ctx.strokeStyle = `rgba(120,62,24,${.5 * ap})`; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(C5 + wig, yy + h * .36 - pinch * h * .5, w * .86, h * .5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
    ctx.filter = 'none';
    const hb = ss(.66, .76, q);
    if (hb > 0) { const hy = C5 + R5 * .6, s = R5 * .13 * hb; ctx.fillStyle = 'rgba(253,248,238,.96)'; ctx.beginPath(); ctx.arc(C5 - s * .5, hy, s * .62, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(C5 + s * .5, hy, s * .62, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(C5 - s * 1.08, hy + s * .1); ctx.lineTo(C5, hy - s * 1.15); ctx.lineTo(C5 + s * 1.08, hy + s * .1); ctx.fill(); }
    if (pinch > 0) { const y0 = C5 + R5 * .74, y1 = C5 + R5 * (.74 - 1.44 * pinch); ctx.strokeStyle = 'rgba(253,248,238,.96)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(C5, y0); ctx.lineTo(C5, y1); ctx.stroke(); }
  }
  let lastQ = -1;
  function upd5(t, time) {
    const q = t;
    if (Math.abs(q - lastQ) > .002 || (q > .2 && q < .66)) { drawRosetta(q, time); latteTex.needsUpdate = true; lastQ = q; }
    let py, px = 0, hgt, thick;
    if (q < .2) { py = .05; hgt = lerp(3.2, 2.2, q / .2); thick = .8; }
    else if (q < .66) { const f = map(q, .2, .66); py = lerp(-.48, .45, f); px = Math.sin(time * 9) * lerp(.05, .14, f); hgt = 1.15; thick = 1; }
    else if (q < .76) { py = .6; hgt = 1.15; thick = .9; }
    else { const f = map(q, .76, .9); py = lerp(.74, -.72, f); hgt = 1.2; thick = .45; }
    const on = q > .02 && q < .9, rS = (radiusAt(LAT_IN, .95) - .01) * 1.5;
    const sx = px * rS, sz = py * rS, sy = .95 * 1.5 + .09;
    const lip = new V3(sx + .12, sy + hgt, sz);
    pitcher.scale.setScalar(.6); pitcher.rotation.set(0, -.9, on ? -1.12 + (q > .76 ? .18 : 0) : -.3);
    const off = new V3(.94, 1.48, 0).multiplyScalar(.6).applyEuler(pitcher.rotation); pitcher.position.copy(lip).sub(off);
    pitcher.visible = q < .97;
    setStream(milk, lip, new V3(sx, sy, sz), on ? thick : 0);
    milk.position.z = sz; milk.material.uniforms.uTop.value = lip.x / Math.max(thick, .01); milk.material.uniforms.uBot.value = sx / Math.max(thick, .01);
    steam5.position.y = sy; steam5.userData.update(time, .6);
  }
  const cam5 = t => ({ pos: new V3(Math.sin(t * .8) * 1.4, lerp(8.2, 6.8, t), lerp(5.8, 4.8, t)), look: new V3(.2, 1.1, 0), focus: null, bg: [0x5a2c0c, 0x060302], key: [new V3(-2, 10, 4), new V3(0, 1, 0)], rim: new V3(5, 4, -5), warm: new V3(-2, 3, 2) });

  /* =========================================================
     ESCENA 6 · FILTRADO V60
     ========================================================= */
  const S6 = new THREE.Group(); scene.add(S6);
  const SERV_Y = .02, V60_Y = SERV_Y + 1.88;
  const servProf = [[.62, 1.84], [.56, 1.76], [.58, 1.6], [.8, 1.3], [.95, .7], [.9, .3], [.7, .05], [0, .05]];
  S6.add(mesh(lathe([[0, 0], [.75, 0], [.95, .3], [1.0, .7], [.85, 1.3], [.62, 1.6], [.6, 1.76], [.67, 1.84], ...servProf]), M.glass, 0, SERV_Y, 0));
  const v60 = new THREE.Group(); v60.position.y = V60_Y; S6.add(v60);
  const v60Geo = lathe([[.17, 0], [.2, .04], [1.28, 1.38], [1.4, 1.44], [1.42, 1.5], [1.33, 1.5], [1.22, 1.42], [.13, .07], [.13, 0]], 128);
  { const a = v60Geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const r = Math.hypot(a[i], a[i + 2]), y = a[i + 1]; if (y > .1 && y < 1.4) { const ang = Math.atan2(a[i + 2], a[i]), rib = 1 + Math.max(0, Math.sin(ang * 12 + y * 3)) * .02; a[i] *= rib; a[i + 2] *= rib; } } v60Geo.computeVertexNormals(); }
  v60.add(mesh(v60Geo, M.ceramic));
  v60.add(mesh(new THREE.CylinderGeometry(1.05, 1.05, .08, 72), M.ceramic, 0, -.04, 0));
  const paperGeo = lathe([[.1, .1], [1.22, 1.42], [1.36, 1.72]], 160);
  { const a = paperGeo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const ang = Math.atan2(a[i + 2], a[i]), f = 1 + Math.sin(ang * 28) * .022 * (a[i + 1] / 1.7); a[i] *= f; a[i + 2] *= f; } paperGeo.computeVertexNormals(); }
  v60.add(mesh(paperGeo, M.paper, 0, .02, 0));
  const bedGeo = new THREE.RingGeometry(.0001, .84, 64, 16); bedGeo.rotateX(-Math.PI / 2); const bedBase = bedGeo.attributes.position.array.slice();
  const bed = mesh(bedGeo, M.grounds, 0, .9, 0, false); v60.add(bed);
  const pool = mesh(new THREE.CircleGeometry(.86, 64), M.coffee, 0, .9, 0, false); pool.rotation.x = -Math.PI / 2; v60.add(pool);
  let servLiq = null, lastLvl = -1;
  function setServer(level) {
    if (Math.abs(level - lastLvl) < .01) return; lastLvl = level;
    const inner = servProf.slice().reverse().map(([r, y]) => [r - .03, y]).filter(([, y]) => y > .06 && y <= level + .05);
    const rr = radiusAt(servProf.slice().reverse(), level + .06) - .03;
    const pts = [[0, .07], ...inner, [rr, level + .06], [0, level + .06]];
    if (servLiq) { servLiq.geometry.dispose(); S6.remove(servLiq); }
    servLiq = mesh(lathe(pts, 64), M.filterCoffee, 0, SERV_Y, 0, false); S6.add(servLiq);
  }
  const kettle = new THREE.Group(); S6.add(kettle);
  const kb = mesh(lathe([[0, 0], [1.05, 0], [1.12, .12], [1.14, 1.15], [1.0, 1.42], [.5, 1.55], [.2, 1.6], [0, 1.6]], 72), M.kettle); kettle.add(kb);
  kettle.add(mesh(new THREE.CylinderGeometry(.12, .14, .22, 24), M.chrome, 0, 1.68, 0));
  const kh = mesh(new THREE.TorusGeometry(.62, .09, 16, 40, Math.PI * 1.1), M.kettle, -1.1, .85, 0); kh.rotation.z = Math.PI * .45; kettle.add(kh);
  const gooseLocal = new THREE.CatmullRomCurve3([new V3(.95, .35, 0), new V3(1.5, .9, 0), new V3(1.95, 1.8, 0), new V3(2.5, 2.15, 0), new V3(3.0, 1.95, 0)]);
  kettle.add(mesh(new THREE.TubeGeometry(gooseLocal, 80, .075, 20), M.kettle));
  kettle.position.set(-3.7, V60_Y + 1.25, -.25); kettle.rotation.z = -.32;
  const water = mesh(new THREE.BufferGeometry(), M.water, 0, 0, 0, false); S6.add(water);
  const drips6 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.drop, 12); S6.add(drips6);
  const steam6 = makeSteam(14, 1.0, 3); S6.add(steam6);
  const tipW = new V3();
  function upd6(t, time) {
    const pour = ss(.05, .13, t) * (1 - ss(.78, .86, t)), bloomA = ss(.12, .3, t) * (1 - ss(.4, .7, t) * .6);
    kettle.rotation.z = lerp(-.12, -.32, pour); kettle.updateMatrixWorld();
    tipW.copy(gooseLocal.getPoint(1)).applyMatrix4(kettle.matrixWorld); S6.worldToLocal(tipW);
    const a = bedGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) { const x = bedBase[i], z = bedBase[i + 2]; a[i + 1] = (Math.sin(x * 9 + time * 2) * Math.cos(z * 8 - time * 1.7) * .03 + .08) * bloomA; }
    bedGeo.attributes.position.needsUpdate = true; bedGeo.computeVertexNormals();
    const wl = ss(.15, .55, t) * (1 - ss(.8, 1, t)); pool.visible = wl > .02; pool.position.y = .9 + wl * .3; pool.scale.setScalar(lerp(.9, 1.18, wl));
    const ang = time * 2.4, rr = .32 + Math.sin(time * .7) * .12, end = new V3(Math.cos(ang) * rr, V60_Y + .95 + wl * .3, Math.sin(ang) * rr * .6);
    water.visible = pour > .02;
    if (water.visible) { const c = new THREE.QuadraticBezierCurve3(tipW.clone(), new V3(tipW.x + .3, tipW.y - .1, tipW.z), end); water.geometry.dispose(); water.geometry = new THREE.TubeGeometry(c, 40, .03 * pour + .004, 12); }
    const drip = ss(.22, .3, t) * (1 - ss(.9, .98, t)), level = lerp(.08, 1.15, ss(.22, .95, t)); setServer(level);
    const top = V60_Y - .02, bottom = SERV_Y + level + .06;
    for (let i = 0; i < 12; i++) { const p = (time * 1.15 + i / 12) % 1; o4.position.set(0, lerp(top, bottom, p * p), 0); o4.rotation.set(0, 0, 0); o4.scale.set(.045 * drip, .07 * drip * (1 + p), .045 * drip); o4.updateMatrix(); drips6.setMatrixAt(i, o4.matrix); }
    drips6.instanceMatrix.needsUpdate = true;
    steam6.position.y = V60_Y + 1.5; steam6.userData.update(time, pour);
  }
  const cam6 = t => ({ pos: new V3(lerp(4.2, .8, t), lerp(5.4, 3.0, t), lerp(11, 9.6, t)), look: new V3(-.7, lerp(3.2, 2.0, t), 0), focus: null, bg: [0x26323a, 0x040506], key: [new V3(3, 11, 5), new V3(0, 2, 0)], rim: new V3(-6, 5, -5), warm: new V3(1, 1, 3) });

  /* =========================================================
     ESCENA 7 · ICE LATTE — hielo, leche y espresso en cascada
     ========================================================= */
  const S7 = new THREE.Group(); scene.add(S7);
  const GL = [[0, 0], [.82, 0], [.88, .06], [.9, .2], [.98, 2.6], [1.0, 2.66], [.95, 2.66], [.93, 2.6], [.85, .24], [.8, .16], [0, .16]];
  const glass7 = mesh(lathe(GL, 96), M.glassT, 0, 0, 0, false); glass7.renderOrder = 5; S7.add(glass7);
  const liqMat = new THREE.ShaderMaterial({
    transparent: false, uniforms: { uTime: T, uMilk: { value: 0 }, uCof: { value: 0 }, uH: { value: 2.3 } },
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: `uniform float uTime,uMilk,uCof,uH; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=.5,s=0.0; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }
      void main(){
        float y=vP.y/uH; if(y>uMilk) discard;
        vec3 milk=vec3(.96,.93,.87), caramel=vec3(.62,.36,.16), cof=vec3(.2,.08,.03);
        float front=1.0-uCof*1.25; float n=fbm(vec3(vP.x*2.2,vP.y*1.6-uTime*.18,vP.z*2.2+uTime*.05));
        float m=smoothstep(front-.12,front+.2,y+(n-.5)*.55)*smoothstep(0.0,.05,uCof);
        float streaks=smoothstep(.45,.7,fbm(vec3(atan(vP.z,vP.x)*3.0,vP.y*2.5-uTime*.3,1.0)));
        vec3 col=mix(milk,mix(caramel,cof,smoothstep(.3,.9,m)),clamp(m+streaks*m*.4,0.0,1.0));
        float ndv=abs(dot(normalize(vN),normalize(vV)));
        col*=.75+.35*ndv; col+=pow(1.0-ndv,3.0)*.25;
        gl_FragColor=vec4(col,1.0);
        #include <colorspace_fragment>
      }`
  });
  const liqGeo = new THREE.CylinderGeometry(.9, .82, 2.3, 64, 40, false); liqGeo.translate(0, 1.15, 0);
  const liq7 = new THREE.Mesh(liqGeo, liqMat); liq7.position.y = .17; S7.add(liq7);
  const iceG = new RoundedBoxGeometry(.62, .58, .6, 4, .12);
  const ices = Array.from({ length: 6 }, (_, i) => { const m = mesh(iceG, M.ice, rnd(-.25, .25), 1.0 + i * .34, rnd(-.25, .25), false); m.rotation.set(rnd(0, 1), rnd(0, 3), rnd(0, 1)); S7.add(m); return m; });
  const mp7 = streamMaterial('#e9e0d2', '#fffaf2', { freq: 12, speed: 5, wob: .4 }), ep7 = streamMaterial('#1a0703', '#b86a2a', { freq: 30, speed: 10 });
  const milk7 = streamMesh(mp7, .09, .07), esp7 = streamMesh(ep7, .05, .04); S7.add(milk7, esp7);
  const shot = new THREE.Group(); shot.add(mesh(lathe([[0, 0], [.32, 0], [.36, .55], [.33, .55], [.3, .05], [0, .05]], 48), M.glass)); S7.add(shot);
  const jug = new THREE.Group(); jug.add(mesh(pGeo, M.steel)); jug.scale.setScalar(.75); S7.add(jug);
  function upd7(t, time) {
    const milkUp = ss(.05, .45, t), cof = ss(.5, .9, t);
    liqMat.uniforms.uMilk.value = lerp(.02, .8, milkUp) + cof * .1; liqMat.uniforms.uCof.value = cof;
    ices.forEach((m, i) => { const lvl = .17 + 2.3 * liqMat.uniforms.uMilk.value; m.position.y = Math.max(.45 + i * .34 * (1 - milkUp * .3), Math.min(lvl - .2 + i * .2, 1.0 + i * .34)) + Math.sin(time * 1.3 + i) * .02; m.rotation.y += .001; });
    const mOn = ss(.04, .08, t) * (1 - ss(.42, .47, t)), eOn = ss(.5, .55, t) * (1 - ss(.86, .9, t));
    const top7 = .17 + 2.3 * liqMat.uniforms.uMilk.value;
    jug.visible = t < .5; jug.rotation.set(0, 0, -1.15 * mOn - .2); const jl = new V3(-.3, 4.4, 0); const joff = new V3(.94, 1.48, 0).multiplyScalar(.75).applyEuler(jug.rotation); jug.position.copy(jl).sub(joff);
    setStream(milk7, jl, new V3(-.05, top7, 0), mOn);
    shot.visible = t > .45; shot.rotation.set(0, 0, -2.2 * eOn - .1); shot.position.set(-.55, 4.1, .1);
    const sl = new V3(-.05, 3.85, .1); setStream(esp7, sl, new V3(.0, top7, .1), eOn);
  }
  const cam7 = t => ({ pos: new V3(lerp(-3.4, 2.4, t), lerp(2.2, 3.0, t), lerp(7.4, 6.6, t)), look: new V3(0, lerp(1.6, 1.8, t), 0), focus: null, bg: [0x1d3634, 0x030606], key: [new V3(-2, 9, 5), new V3(0, 1.4, 0)], rim: new V3(3, 3, -6), warm: new V3(-2, 1, 2) });

  /* =========================================================
     ESCENA 8 · FINAL — la taza Valmass y el cartel
     ========================================================= */
  const S8 = new THREE.Group(); scene.add(S8);
  const finTex = canvasTex(LA, LA, x => drawRosetta(1, 0, x));
  const cup8 = makeLatteCup(finTex); cup8.scale.setScalar(1.35); cup8.position.y = .08; S8.add(cup8);
  const signBox = mesh(new RoundedBoxGeometry(6.4, 2.0, .3, 6, .08), M.machine, 0, 3.6, -4.2); S8.add(signBox);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.875), M.sign); signFace.position.set(0, 3.6, -4.04); S8.add(signFace);
  const scat = new THREE.InstancedMesh(BEAN, M.bean, 40); scat.castShadow = true; S8.add(scat);
  { const o = new THREE.Object3D(); for (let i = 0; i < 40; i++) { const r = rnd(2.3, 4.6), a = rnd(0, 6.28); o.position.set(Math.cos(a) * r, .1, Math.sin(a) * r); o.rotation.set(-Math.PI / 2 + rnd(-.3, .3), rnd(0, 6), rnd(-.3, .3)); o.scale.setScalar(rnd(.15, .2)); o.updateMatrix(); scat.setMatrixAt(i, o.matrix); } }
  const steam8 = makeSteam(16, .9, 3.5); steam8.position.y = 1.45; S8.add(steam8);
  const dust8 = makeDust(300, 6); dust8.position.y = 3; S8.add(dust8);
  function upd8(t, time) { steam8.userData.update(time, 1); }
  const cam8 = t => { const a = lerp(-.9, .9, t); return { pos: new V3(Math.sin(a) * 7.4, lerp(4.6, 3.4, t), Math.cos(a) * 7.4), look: new V3(0, lerp(1.4, 1.7, t), -.6), focus: null, bg: [0x3a2008, 0x050302], key: [new V3(2, 10, 5), new V3(0, 1, 0)], rim: new V3(-4, 5, -6), warm: new V3(0, 2, 3) }; };

  /* =========================================================
     CAPÍTULOS, CÁMARA, BUCLE
     ========================================================= */
  const chapters = [[S1, upd1, cam1], [S2, upd2, cam2], [S3, upd3, cam3], [S4, upd4, cam4], [S5, upd5, cam5], [S6, upd6, cam6], [S7, upd7, cam7], [S8, upd8, cam8]];
  const chapEls = [...sec.querySelectorAll('.lab-chap')], dots = [...sec.querySelectorAll('.lab-dots i')], fade = sec.querySelector('.lab-fade'), bar = sec.querySelector('.lab-bar i');

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    filmPass.uniforms.uRes.value.set(w, h); bloom.resolution.set(w / 2, h / 2);
  }
  addEventListener('resize', resize, { passive: true }); resize();

  // precompilar shaders (evita tirones al cambiar de escena)
  manager.onLoad = () => {
    chapters.forEach(([g]) => g.visible = true);
    try { renderer.compile(scene, camera); } catch (e) {}
    chapters.forEach(([g], k) => g.visible = k === 0);
    ready = true; progress(1);
  };
  setTimeout(() => { if (!ready) { ready = true; progress(1); } }, 12000);

  const clock = new THREE.Clock();
  let ps = 0, time = 0, visible = false, wasVis = false, cur = -1;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '200px' }).observe(sec);
  const cA = new THREE.Color(), cB = new THREE.Color(), dropW = new V3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible) { wasVis = false; return; }
    time += dt; T.value = time; filmPass.uniforms.uTime.value = time;
    const r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight));
    if (!wasVis) ps = p; wasVis = true;
    ps = Math.abs(p - ps) < .0004 ? p : lerp(ps, p, 1 - Math.pow(.86, dt * 60));
    const n = chapters.length, i = Math.min(n - 1, Math.floor(ps * n)), t = clamp(ps * n - i);
    if (i !== cur) {
      cur = i; chapters.forEach(([g], k) => g.visible = k === i);
      chapEls.forEach((e, k) => e.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i));
      counter.visible = i !== 0 || true;
    }
    fade.style.opacity = 1 - clamp(Math.min(i === 0 ? 1 : t / .05, i === n - 1 ? 1 : (1 - t) / .05));
    if (bar) bar.style.transform = `scaleX(${ps})`;
    sec.toggleAttribute('data-started', ps > .015);
    const [, upd, cam] = chapters[i];
    upd(t, time);
    const c = cam(t);
    // encuadre para pantallas verticales
    const narrow = camera.aspect < 1, k = narrow ? 1 + (1 - camera.aspect) * 1.1 : 1;
    if (!narrow) { const sh = -.9; c.look.x += sh; c.pos.x += sh; }
    camera.position.copy(c.look).add(c.pos.clone().sub(c.look).multiplyScalar(k));
    camera.lookAt(c.look);
    // luces
    key.position.copy(c.key[0]); key.target.position.copy(c.key[1]); rim.position.copy(c.rim); warm.position.copy(c.warm);
    cA.set(c.bg[0]); cB.set(c.bg[1]); backdrop.material.uniforms.uA.value.lerp(cA, .08); backdrop.material.uniforms.uB.value.lerp(cB, .08);
    // foco (profundidad de campo)
    if (bokeh) {
      let fd = camera.position.distanceTo(c.look);
      if (c.focus === 'drop' && drop.visible) { drop.getWorldPosition(dropW); fd = camera.position.distanceTo(dropW); }
      bokeh.uniforms.focus.value = lerp(bokeh.uniforms.focus.value, fd, .2);
      bokeh.uniforms.aperture.value = i === 3 ? .0022 : i === 0 ? .0016 : .0009;
    }
    composer.render();
  }
  requestAnimationFrame(frame);
}
