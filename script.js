/* VALMASS WEB · V1 — motor de scroll cinematográfico (vanilla, sin dependencias) */
(() => {
  document.documentElement.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (n, a = 0, b = 1) => Math.min(Math.max(n, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b) => clamp((v - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const body = document.body;
  let vw = innerWidth, vh = innerHeight;
  const mobile = () => vw <= 900;
  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  body.classList.add('locked');

  // Puente con la escena 3D (beans.js)
  const G = window.VALMASS = { hero: 0, origins: -1, mx: 0, my: 0, active: false, mobile: mobile() };

  /* =========================================================
     TEXTO PARTIDO (letras / palabras)
     ========================================================= */
  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    let i = 0;
    words.forEach((w, wi) => {
      const ws = document.createElement('span'); ws.className = 'w';
      [...w].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; c.style.setProperty('--i', i++); ws.appendChild(c); });
      el.appendChild(ws);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const ws = document.createElement('span'); ws.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = w; ws.style.setProperty('--i', i); wi.style.setProperty('--i', i);
      ws.appendChild(wi); el.appendChild(ws); el.appendChild(document.createTextNode(' '));
    });
  }
  $$('[data-split]').forEach(splitChars);
  $$('[data-split-words]').forEach(splitWords);
  $$('.gate-mark span, .foot-mark span, .sb-mark span').forEach((s, i, a) => s.style.setProperty('--i', i % 7));
  $$('#menu a').forEach(a => a.style.setProperty('--i', a.dataset.i));

  /* =========================================================
     MÚSICA — usa "musica.mp3" si existe en el repo;
     si no, genera un lo-fi original con Web Audio (sin derechos de terceros)
     ========================================================= */
  const Music = (() => {
    const btn = $('#sound');
    let on = false, ctx = null, master = null, timer = null, file = null, step = 0, nextT = 0, crackle = null;
    const BPM = 74, S8 = 60 / BPM / 2;
    const chords = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]]; // Fmaj9 Em9 Dm9 Cmaj9
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    function probeFile() {
      return new Promise(res => {
        const a = new Audio(); a.preload = 'auto'; a.loop = true; a.volume = .5;
        a.oncanplaythrough = () => { file = a; res(true); };
        a.onerror = () => res(false);
        a.src = 'musica.mp3';
        setTimeout(() => res(!!file), 2000);
      });
    }
    function ep(f, t, dur, gain) { // piano eléctrico suave
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), trem = ctx.createOscillator(), tg = ctx.createGain(), lp = ctx.createBiquadFilter();
      o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2.001;
      const g2 = ctx.createGain(); g2.gain.value = .12;
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      trem.frequency.value = 4.2; tg.gain.value = gain * .18; trem.connect(tg); tg.connect(g.gain);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .03); g.gain.exponentialRampToValueAtTime(gain * .35, t + .8); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(master);
      [o1, o2, trem].forEach(o => { o.start(t); o.stop(t + dur + .1); });
    }
    function bass(f, t, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 380;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.38, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
    }
    function kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .2);
      g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .38);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + .4);
    }
    let noiseBuf = null;
    function noise(t, v, freq, q, dur, type = 'bandpass') {
      if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .02);
    }
    function vinyl() {
      const len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * .015 + (Math.random() < .0006 ? (Math.random() * 2 - 1) * .6 : 0);
      const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; s.loop = true; lp.type = 'lowpass'; lp.frequency.value = 5000; g.gain.value = .5;
      s.connect(lp); lp.connect(g); g.connect(master); s.start(); return s;
    }
    function schedule() {
      while (nextT < ctx.currentTime + .15) {
        const s = step % 8, bar = Math.floor(step / 8) % 4, ch = chords[bar];
        const swing = s % 2 ? S8 * .16 : 0, t = nextT + swing;
        if (s === 0) ch.forEach((m, k) => ep(hz(m), t + k * .018, S8 * 7.5, .055));
        if (s === 5 && bar % 2) ep(hz(ch[ch.length - 1] + 12), t, S8 * 2, .035);
        if (s === 0) bass(hz(ch[0] - 12), t, S8 * 2.6);
        if (s === 5) bass(hz(ch[0] - 12 + 7), t, S8 * 1.5);
        if (s === 0 || s === 5) kick(t);
        if (s === 2 || s === 6) noise(t, .11, 1800, .7, .18);
        noise(t, s % 2 ? .02 : .035, 8000, .5, .05, 'highpass');
        nextT += S8; step++;
      }
    }
    async function start() {
      if (on) return;
      on = true; btn.setAttribute('aria-pressed', 'true');
      try { localStorage.setItem('valmass-music', 'on'); } catch (e) {}
      if (file === null) await probeFile();
      if (file) { file.play().catch(() => {}); return; }
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(.42, ctx.currentTime + 2.5);
      crackle = vinyl();
      step = 0; nextT = ctx.currentTime + .1;
      timer = setInterval(schedule, 40); schedule();
    }
    function stop() {
      on = false; btn.setAttribute('aria-pressed', 'false');
      try { localStorage.setItem('valmass-music', 'off'); } catch (e) {}
      if (file) { file.pause(); return; }
      if (!ctx) return;
      clearInterval(timer);
      const m = master; m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setValueAtTime(m.gain.value, ctx.currentTime); m.gain.linearRampToValueAtTime(0, ctx.currentTime + .6);
      const c = crackle; setTimeout(() => { try { c && c.stop(); m.disconnect(); } catch (e) {} }, 700);
    }
    btn.addEventListener('click', () => on ? stop() : start());
    document.addEventListener('visibilitychange', () => { if (!ctx || file) return; document.hidden ? ctx.suspend() : on && ctx.resume(); });
    return { start, stop };
  })();

  /* =========================================================
     SECUENCIAS DE VIDEO CONTROLADAS POR EL SCROLL
     ========================================================= */
  class Sequence {
    constructor(sec) {
      this.sec = sec; this.name = sec.dataset.seq; this.n = +sec.dataset.frames;
      this.canvas = $('.seq-canvas', sec); this.ctx = this.canvas.getContext('2d');
      this.bg = $('.seq-bg', sec); this.bgx = this.bg && this.bg.getContext('2d');
      this.frames = new Array(this.n); this.loaded = 0; this.cur = -1; this.started = false;
      this.resize();
    }
    src(i) { return `assets/seq/${this.name}/${String(i + 1).padStart(3, '0')}.webp`; }
    load(onProgress, stride = 1) {
      if (this.started && stride === 1 && this.full) return this.full;
      this.started = true;
      const order = [];
      for (let s of [8, 4, 2, 1]) for (let i = 0; i < this.n; i += s) if (!order.includes(i)) order.push(i);
      const want = stride === 1 ? order : order.filter(i => i % stride === 0);
      let done = 0;
      const p = new Promise(res => {
        let k = 0, active = 0;
        const next = () => {
          if (k >= want.length) { if (!active) res(); return; }
          const i = want[k++];
          if (this.frames[i]) { done++; next(); return; }
          active++;
          const img = new Image(); img.decoding = 'async';
          img.onload = img.onerror = () => {
            if (img.naturalWidth) { this.frames[i] = img; this.loaded++; if (this.cur === -1 || Math.abs(i - this.target) < 3) this.cur = -2; }
            active--; done++; onProgress && onProgress(done / want.length); next();
            if (k >= want.length && !active) res();
          };
          img.src = this.src(i);
        };
        for (let c = 0; c < 6; c++) next();
      });
      if (stride === 1) this.full = p;
      return p;
    }
    resize() {
      const r = dpr(), c = this.canvas;
      c.width = Math.round(c.clientWidth * r) || 1; c.height = Math.round(c.clientHeight * r) || 1;
      if (this.bg) { this.bg.width = 48; this.bg.height = 48; }
      this.cur = -2;
    }
    nearest(i) {
      for (let d = 0; d < this.n; d++) { if (this.frames[i - d]) return this.frames[i - d]; if (this.frames[i + d]) return this.frames[i + d]; }
      return null;
    }
    draw(p) {
      const i = Math.round(clamp(p) * (this.n - 1)); this.target = i;
      if (i === this.cur) return;
      const img = this.nearest(i); if (!img) return;
      this.cur = this.frames[i] ? i : -2;
      const c = this.canvas, x = this.ctx, iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.max(c.width / iw, c.height / ih), w = iw * s, h = ih * s;
      x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      if (this.bgx) this.bgx.drawImage(img, 0, 0, 48, 48);
    }
  }
  const seqs = $$('.seq-section').map(s => new Sequence(s));
  const seqBy = n => seqs.find(s => s.name === n);


  /* =========================================================
     CINE (sección #lab): 4 videos de café manejados por el scroll
     ========================================================= */
  const Lab = (() => {
    const sec = $('#lab'); if (!sec) return null;
    const cv = $('.lab-canvas', sec), cx = cv.getContext('2d');
    const chaps = $$('.lab-chap', sec), dots = $$('.lab-dots i', sec), fade = $('.lab-fade', sec), barI = $('.lab-bar i', sec);
    const defs = [['cine-granos', 92], ['cine-porta', 98], ['cine-gota', 110], ['cine-leche', 108]];
    const S = defs.map(([name, n]) => ({ name, n, frames: new Array(n), started: false, full: null }));
    function load(s, stride = 1, onP) {
      if (stride === 1 && s.full) return s.full;
      const order = []; for (const st of [8, 4, 2, 1]) for (let i = 0; i < s.n; i += st) if (!order.includes(i)) order.push(i);
      const want = order.filter(i => stride === 1 || i % stride === 0);
      let k = 0, done = 0, active = 0;
      const pr = new Promise(res => {
        const next = () => {
          if (k >= want.length) { if (!active) res(); return; }
          const i = want[k++]; if (s.frames[i]) { done++; next(); return; }
          active++; const img = new Image(); img.decoding = 'async';
          img.onload = img.onerror = () => { if (img.naturalWidth) s.frames[i] = img; active--; done++; onP && onP(done / want.length); last = -1; next(); if (k >= want.length && !active) res(); };
          img.src = `assets/seq/${s.name}/${String(i + 1).padStart(3, '0')}.webp`;
        };
        for (let c = 0; c < 6; c++) next();
      });
      if (stride === 1) s.full = pr;
      return pr;
    }
    function size() { const r = dpr(); cv.width = Math.round(cv.clientWidth * r) || 1; cv.height = Math.round(cv.clientHeight * r) || 1; last = -1; }
    let last = -1, cur = -1;
    function draw(ci, t) {
      const s = S[ci], i = Math.round(clamp(t) * (s.n - 1)), key = ci * 1000 + i + Math.round(t * 200) / 1000;
      if (key === last) return; last = key;
      let img = null; for (let d = 0; d < s.n && !img; d++) img = s.frames[i - d] || s.frames[i + d];
      if (!img) return;
      const z = 1.04 + t * .08, iw = img.naturalWidth, ih = img.naturalHeight;
      const sc = Math.max(cv.width / iw, cv.height / ih) * z, w = iw * sc, h = ih * sc;
      cx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    }
    function frameAt(p) {
      const n = S.length, ci = Math.min(n - 1, Math.floor(p * n)), t = clamp(p * n - ci);
      if (ci !== cur) { cur = ci; chaps.forEach((c, k) => c.classList.toggle('on', k === ci)); dots.forEach((d, k) => d.classList.toggle('on', k === ci)); load(S[ci]); if (S[ci + 1]) load(S[ci + 1]); }
      fade.style.opacity = 1 - clamp(Math.min(ci === 0 ? 1 : t / .06, ci === n - 1 ? 1 : (1 - t) / .06));
      barI.style.transform = `scaleX(${p})`;
      draw(ci, t);
    }
    addEventListener('resize', size, { passive: true }); size();
    return { S, load, frameAt, size };
  })();

  /* =========================================================
     DIBUJOS DE LA PARED (SVG que se dibuja con el scroll)
     ========================================================= */
  const drawings = $$('.drawing');
  drawings.forEach(d => {
    fetch(d.dataset.svg).then(r => r.text()).then(t => {
      d.innerHTML = t;
      $$('path', d).forEach(p => p.setAttribute('pathLength', '1'));
      d.ready = true;
    }).catch(() => { d.innerHTML = `<img src="${d.dataset.svg}" alt="">`; });
  });
  function setDraw(d, p) {
    if (!d.ready) return;
    p = clamp(p);
    if (Math.abs((d.last || -1) - p) < .002) return;
    d.last = p;
    $$('path', d).forEach(path => path.style.strokeDashoffset = 1 - p);
    d.classList.toggle('done', p > .96);
  }

  /* =========================================================
     ENTRADA + PRECARGA
     ========================================================= */
  const gate = $('#gate'), enterBtn = $('#enter'), muteBtn = $('#enter-mute');
  const bar = $('.gate-bar i'), pct = $('.gate-pct');
  let shown = 0, real = 0;
  const tick = () => { shown = lerp(shown, real, .12); bar.style.transform = `scaleX(${shown})`; pct.textContent = Math.round(shown * 100) + '%'; if (shown < .995) requestAnimationFrame(tick); else { pct.textContent = '100%'; } };
  requestAnimationFrame(tick);
  const ready = () => { real = 1; enterBtn.disabled = false; muteBtn.disabled = false; };
  Promise.race([
    Promise.all([Lab ? Lab.load(Lab.S[0], 2, p => real = Math.max(real, p * .95)) : 0, document.fonts ? document.fonts.ready : 0]),
    new Promise(r => setTimeout(r, 9000))
  ]).then(ready);

  let entered = false;
  function enter(withSound) {
    if (entered) return; entered = true;
    let pref = 'on'; try { pref = localStorage.getItem('valmass-music') || 'on'; } catch (e) {}
    if (withSound && pref !== 'off') Music.start();
    gate.classList.add('out');
    setTimeout(() => { body.classList.remove('locked'); G.active = true; $('#gl').classList.add('on'); $('#hero').classList.add('in'); $$('#hero [data-split], #hero [data-split-words]').forEach(e => e.classList.add('in')); }, 650);
    setTimeout(() => gate.classList.add('gone'), 1400);
    // resto de las secuencias en segundo plano, en orden
    (async () => { if (Lab) for (const x of Lab.S) await Lab.load(x); for (const n of ['latte', 'espresso', 'filtro', 'ice']) await seqBy(n).load(); })();
  }
  enterBtn.addEventListener('click', () => enter(true));
  muteBtn.addEventListener('click', () => enter(false));

  /* =========================================================
     REVELADOS AL ENTRAR EN PANTALLA
     ========================================================= */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-split], [data-split-words], .reveal-clip, .menu-list, .foot, .signband, .rail').forEach(el => { if (!el.closest('#hero')) io.observe(el); });
  $$('.menu-list').forEach(l => $$('.mi', l).forEach((m, i) => m.style.setProperty('--i', i)));

  /* =========================================================
     SECCIONES Y MEDIDAS
     ========================================================= */
  const pins = $$('.pin').map(el => ({ el, id: el.id, top: 0, h: 0 }));
  const hero = $('#hero'), l1 = $('.ht-line.l1'), l2 = $('.ht-line.l2'), ghosts = $$('.ghost-row'), heroFade = $('.hero-fade'), heroMeta = $('.hero-meta');
  const mq = $('.mq-track');
  const track = $('.hs-track'), hsImgs = $$('.hs-img img');
  const vbox = $('.vexp-box'), vvid = $('.vexp-video'), vtext = $('.vexp-text');
  const origins = $('.bar-intro');
  const header = $('header'), glCanvas = $('#gl');
  const flakesBox = $('.ice-flakes');
  const flakes = Array.from({ length: 34 }, () => { const i = document.createElement('i'); flakesBox.appendChild(i); return { el: i, x: Math.random(), y: Math.random(), z: .4 + Math.random() * 1.2, r: Math.random() * 360 }; });
  let trackW = 0;

  function measure() {
    vw = innerWidth; vh = innerHeight; G.mobile = mobile();
    pins.forEach(p => { p.top = p.el.offsetTop; p.h = p.el.offsetHeight; });
    trackW = track.scrollWidth;
    seqs.forEach(s => s.resize()); if (Lab) Lab.size();
    // el lugar: alto según el ancho del carrusel
    const lugar = pins.find(p => p.id === 'lugar');
    lugar.el.style.setProperty('--h', Math.max(trackW - vw, 0) + vh * 1.4 + 'px');
    pins.forEach(p => { p.top = p.el.offsetTop; p.h = p.el.offsetHeight; });
  }
  let lastW = innerWidth;
  addEventListener('resize', () => { if (mobile() && Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; measure(); }, { passive: true });
  addEventListener('load', measure);
  measure();

  /* =========================================================
     BUCLE PRINCIPAL
     ========================================================= */
  let sy = 0, lastSy = 0, mqX = 0, vel = 0, lastDir = 0;
  const prog = p => clamp((sy - p.top) / (p.h - vh));
  const near = p => sy > p.top - vh * 1.2 && sy < p.top + p.h + vh * .2;

  function heroFrame(p) {
    const e = easeInOut(map(p, 0, .8));
    l1.style.transform = `translate3d(${-e * 60}vw,${-e * 8}vh,0) rotate(${-e * 6}deg)`;
    l2.style.transform = `translate3d(${e * 60}vw,${e * 8}vh,0) rotate(${e * 6}deg)`;
    ghosts[0].style.transform = `translate3d(${-10 - p * 40}vw,0,0)`;
    ghosts[1].style.transform = `translate3d(${-30 + p * 40}vw,0,0)`;
    heroMeta.style.opacity = 1 - map(p, .05, .35);
    heroMeta.style.transform = `translateY(${map(p, .05, .35) * 40}px)`;
    heroFade.style.opacity = map(p, .82, 1);
    G.hero = p;
  }

  function seqFrame(s, p) {
    const sec = s.sec, frame = $('.seq-frame', sec), title = $('.big-title', sec), copy = $('.seq-copy', sec);
    // entrada (0–.12), scrub (.08–.86), expansión (.86–1)
    const pin = map(p, 0, .12), scrub = map(p, .06, .86), out = map(p, .86, 1);
    s.draw(scrub);
    if (!mobile()) {
      const fw = frame.offsetWidth, fh = frame.offsetHeight;
      const full = Math.max(vw / fw, vh / fh);
      const sc = lerp(.72, 1, easeOut(pin)) * lerp(1, full, easeInOut(out));
      frame.style.transform = `translate(-50%,-50%) scale(${sc}) rotate(${lerp(-4, 0, easeOut(pin))}deg)`;
      frame.style.borderRadius = `${lerp(22, 0, out) / sc}px`;
    } else {
      frame.style.transform = `translate(-50%,-50%) scale(${lerp(1.12, 1, easeOut(pin))})`;
    }
    if (title) {
      const [a, b] = title.children;
      a.style.transform = `translate3d(${lerp(-30, 10, scrub) - out * 40}vw,0,0)`;
      b.style.transform = `translate3d(${lerp(30, -10, scrub) + out * 40}vw,0,0)`;
      title.style.opacity = mobile() ? 1 - out : 1;
    }
    if (copy) {
      const vis = map(p, .1, .2) * (1 - map(p, .8, .88));
      copy.style.opacity = vis;
      if (vis > .5 && !copy.dataset.in) { copy.dataset.in = 1; $$('[data-split-words]', copy).forEach(e => e.classList.add('in')); }
    }
    $$('[data-at]', sec).forEach(li => li.classList.toggle('on', scrub >= +li.dataset.at && (li.nextElementSibling ? scrub < +li.nextElementSibling.dataset.at : true)));
    const tl = $('.tl-bar i', sec); if (tl) tl.style.transform = `scaleX(${scrub})`;
    const cnt = $('.c-now', sec); if (cnt) cnt.textContent = String(Math.round(scrub * (s.n - 1)) + 1).padStart(3, '0');
    const dr = $('.filtro-draw', sec); if (dr) setDraw(dr, map(p, .02, .7));
    if (s.name === 'ice') flakes.forEach(f => {
      const y = ((f.y - p * f.z * 1.6) % 1 + 1) % 1;
      f.el.style.transform = `translate3d(${f.x * vw}px,${y * vh}px,0) rotate(${f.r + p * 400 * f.z}deg) scale(${f.z})`;
      f.el.style.opacity = map(p, .05, .2) * (1 - out);
    });
  }

  function hsFrame(p) {
    const x = -(trackW - vw) * p;
    track.style.transform = `translate3d(${x}px,0,0)`;
    hsImgs.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      const c = (r.left + r.width / 2 - vw / 2) / vw;
      img.style.transform = `translate3d(${c * -40}px,${-8 + c * 4}%,0) scale(1.05)`;
    });
  }

  function vexpFrame(p) {
    const e = easeInOut(map(p, .05, .7));
    const w0 = mobile() ? vw * .46 : vw * .22, h0 = mobile() ? vh * .3 : vh * .38;
    vbox.style.width = lerp(w0, vw, e) + 'px';
    vbox.style.height = lerp(h0, vh, e) + 'px';
    vbox.style.borderRadius = lerp(24, 0, e) + 'px';
    vtext.style.transform = `scale(${lerp(1, 1.5, e)})`;
    vtext.style.opacity = 1 - map(p, .2, .55);
  }

  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastT) / 16.67, 30); lastT = now;
    const y = scrollY;
    const k = 1 - Math.pow(1 - (mobile() ? .35 : .14), dt);
    sy = Math.abs(y - sy) < .3 ? y : lerp(sy, y, k);
    vel = lerp(vel, sy - lastSy, .1); lastSy = sy;

    pins.forEach(p => {
      if (!near(p)) return;
      const pr = prog(p);
      if (p.id === 'hero') heroFrame(pr);
      else if (p.el.classList.contains('seq-section')) seqFrame(seqs.find(s => s.sec === p.el), pr);
      else if (p.id === 'lugar') hsFrame(pr);
      else if (p.id === 'video') vexpFrame(pr);
      else if (p.id === 'lab' && Lab) Lab.frameAt(pr);
    });
    const h = pins[0]; if (!near(h)) G.hero = 1;

    // granos en Orígenes
    const ro = origins.getBoundingClientRect();
    G.origins = ro.top < vh && ro.bottom > vh * .55 ?clamp((vh - ro.top) / (ro.height + vh)) : -1;
    G.orgFade = clamp((ro.bottom - vh * .55) / (vh * .4));
    glCanvas.style.visibility = entered && (G.hero < .995 || G.origins >= 0) ? 'visible' : 'hidden';

    // marquesina reactiva a la velocidad del scroll
    mqX -= 1.2 + Math.abs(vel) * .6;
    const half = mq.scrollWidth / 2;
    if (half) { if (-mqX > half) mqX += half; mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${clamp(vel * -.4, -12, 12)}deg)`; }

    // dibujos sueltos (bolsa, taza)
    drawings.forEach(d => {
      if (d.classList.contains('filtro-draw')) return;
      const r = d.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) setDraw(d, map(vh - r.top, vh * .1, vh * .1 + r.height * 1.1));
    });

    // header
    if (entered) {
      const dir = Math.sign(y - lastDir);
      if (Math.abs(y - lastDir) > 6) { header.classList.toggle('hide', dir > 0 && y > vh * .6 && !menuOpen); lastDir = y; }
      header.classList.toggle('solid', y > 40);
    }
    // video: reproducir solo si está a la vista
    const vr = vbox.getBoundingClientRect();
    const vin = vr.top < vh && vr.bottom > 0;
    if (vin && vvid.paused) { vvid.preload = 'auto'; vvid.play().catch(() => {}); } else if (!vin && !vvid.paused) vvid.pause();
  }
  requestAnimationFrame(frame);

  /* =========================================================
     CURSOR, BOTONES MAGNÉTICOS, TARJETAS 3D
     ========================================================= */
  const cur = $('#cursor'), curLabel = $('#cursor span');
  let mx = vw / 2, my = vh / 2, cx = mx, cy = my;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    G.mx = mx / vw * 2 - 1; G.my = my / vh * 2 - 1;
  }, { passive: true });
  (function cursorLoop() { cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(cursorLoop); })();
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('a, button, .mi, .org-card, .hs-item');
    cur.classList.toggle('hover', !!t);
    const lab = t && (t.matches('.mi') ? 'ver' : t.matches('.hs-item') ? 'arrastrá' : '');
    cur.classList.toggle('label', !!lab); if (lab) curLabel.textContent = lab;
  });

  $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), color .4s'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 600); });
  });

  $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`; });
    c.addEventListener('pointerleave', () => c.style.transform = '');
  });

  /* =========================================================
     CARTA: pestañas + foto que sigue al mouse
     ========================================================= */
  const tabs = $$('.menu-tabs button');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(b => b.setAttribute('aria-selected', String(b === t)));
    $$('.menu-list').forEach(l => {
      const on = l.dataset.panel === t.dataset.tab;
      l.hidden = !on; if (on) { l.classList.remove('in'); void l.offsetWidth; l.classList.add('in'); }
    });
  }));
  const fl = $('.menu-float'), flImg = $('img', fl);
  let fx = 0, fy = 0, fpx = 0, fpy = 0, flOn = false;
  $$('.mi').forEach(m => {
    m.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; flImg.src = m.dataset.img; fl.classList.add('show'); flOn = true; });
    m.addEventListener('pointerleave', () => { fl.classList.remove('show'); flOn = false; });
    m.addEventListener('click', () => { if (mobile()) { const o = m.classList.contains('open'); $$('.mi.open').forEach(x => x.classList.remove('open')); if (!o) m.classList.add('open'); } });
  });
  (function floatLoop() {
    fx = lerp(fx, mx, .14); fy = lerp(fy, my, .14);
    const dx = fx - fpx; fpx = fx; fpy = fy;
    fl.style.transform = `translate(${fx}px,${fy}px) translate(-50%,-50%) scale(${flOn ? 1 : .6}) rotate(${clamp(dx * .6, -12, 12)}deg)`;
    requestAnimationFrame(floatLoop);
  })();


  /* =========================================================
     CAFÉS (vitrina animada) y TÉS INTI ZEN
     ========================================================= */
  const D = window.VALMASS_DATA;
  const fmt = n => Math.round(n).toLocaleString('es-AR');
  if (D) {
    const shopEl = $('#cafes'), stage = $('.stage'), info = $('.stage-info');
    const imgs = $$('.bag-img'), card = $('.bag-card');
    const rail = $('.rail'), track = $('.rail-track');
    let list = D.cafes.slice(), idx = 0, size = '250', grind = 0, priceShown = 0, auto = null, idle = 0, inView = false;
    // granos flotando alrededor del paquete
    const beansBox = $('.bag-beans');
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('i'); b.className = 'bean';
      const a = i / 9 * Math.PI * 2;
      b.style.cssText = `left:${50 + Math.cos(a) * 52}%;top:${50 + Math.sin(a) * 50}%;--d:${6 + Math.random() * 5}s;--dl:${-Math.random() * 6}s;--r:${Math.random() * 360}deg;--x:${(Math.random() - .5) * 40}px;--y:${-20 - Math.random() * 30}px;scale:${.55 + Math.random() * .7}`;
      beansBox.appendChild(b);
    }
    // riel con todos los cafés
    D.cafes.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'rc'; b.style.setProperty('--i', i); b.style.setProperty('--rc', c.color); b.dataset.id = c.id; b.dataset.tipo = c.tipo;
      b.innerHTML = `<span class="rc-img"><img src="${c.img}" alt="${c.nombre}" loading="lazy"></span><span class="rc-name">${c.nombre}</span><span class="rc-meta"><span>${c.origen}</span><span>$${fmt(c.precio)}</span></span>`;
      b.addEventListener('click', () => { if (rail.moved) return; const k = list.findIndex(x => x.id === c.id); if (k < 0) { setFilter('all'); } go(list.findIndex(x => x.id === c.id), 1, true); });
      track.appendChild(b);
    });
    const rcs = $$('.rc', track);
    function countTo(to) {
      const from = priceShown, t0 = performance.now(), el = $('.si-num');
      const step = now => { const k = clamp((now - t0) / 800), e = 1 - Math.pow(1 - k, 3); priceShown = from + (to - from) * e; el.textContent = fmt(priceShown); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    function price(c) { return size === 'kg' && c.precioKg ? c.precioKg : c.precio; }
    function fill(c) {
      $('.si-origin').textContent = c.origen + (c.tipo === 'blend' ? ' · Blend' : '');
      $('.si-name').textContent = c.nombre;
      $('.si-notes').textContent = c.notas + '.';
      const rows = [['Región', c.region], ['Varietal', c.varietal], ['Proceso', c.proceso], ['Altura', c.altura], ['Tueste', c.tueste], ['Cuerpo', c.cuerpo]].filter(r => r[1] && r[1] !== '—');
      if (c.sca) rows.push(['Puntaje SCA', c.sca + ' pts']);
      $('.si-table').innerHTML = rows.slice(0, 8).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      const sz = $('.si-size');
      sz.innerHTML = `<button aria-pressed="${size !== 'kg' || !c.precioKg}" data-s="250">250 g</button>` + (c.precioKg ? `<button aria-pressed="${size === 'kg'}" data-s="kg">1 kg</button>` : '');
      $$('button', sz).forEach(b => b.addEventListener('click', () => { size = b.dataset.s; $$('button', sz).forEach(x => x.setAttribute('aria-pressed', String(x === b))); countTo(price(c)); swapImg(size === 'kg' && c.imgKg ? c.imgKg : c.img, 1); hold(); }));
      $('.si-grind').innerHTML = D.molienda.map((m, i) => `<button aria-pressed="${i === grind}">${m}</button>`).join('');
      $$('.si-grind button').forEach((b, i) => b.addEventListener('click', () => { grind = i; $$('.si-grind button').forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); hold(); }));
      $('.stage-ghost span').textContent = (c.nombre + ' · ' + c.origen + ' · ').repeat(4);
      $('.sn-count').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      countTo(price(c));
    }
    let front = 0;
    function swapImg(src, dir) {
      const cur = imgs[front], nxt = imgs[1 - front];
      nxt.className = 'bag-img enter' + (dir < 0 ? ' back' : ''); nxt.src = src;
      void nxt.offsetWidth;
      nxt.className = 'bag-img';
      cur.className = 'bag-img leave' + (dir < 0 ? ' back' : '');
      front = 1 - front;
    }
    function go(i, dir = 1, user = false) {
      if (!list.length) return;
      idx = (i + list.length) % list.length;
      const c = list[idx];
      if (!c.precioKg) size = '250';
      shopEl.style.setProperty('--c', c.color);
      swapImg(c.img, dir);
      info.classList.add('swap');
      setTimeout(() => { fill(c); info.classList.remove('swap'); }, 320);
      rcs.forEach(r => r.classList.toggle('on', r.dataset.id === c.id));
      const on = rcs.find(r => r.dataset.id === c.id);
      if (on && user !== 'init') rail.scrollTo({ left: on.offsetLeft - rail.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth' });
      if (user === true) hold();
      restartAuto();
    }
    function hold() { idle = performance.now(); }
    function restartAuto() { const a = $('.sn-auto'); a.classList.remove('run'); void a.offsetWidth; if (inView) a.classList.add('run'); clearTimeout(auto); auto = setTimeout(tickAuto, 6000); }
    function tickAuto() { if (inView && performance.now() - idle > 12000) go(idx + 1, 1); else restartAuto(); }
    function setFilter(f) {
      $$('.shop-filters button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      list = D.cafes.filter(c => f === 'all' || c.tipo === f);
      rcs.forEach(r => r.classList.toggle('hide', !(f === 'all' || r.dataset.tipo === f)));
      rail.scrollTo({ left: 0 });
    }
    $$('.shop-filters button').forEach(b => b.addEventListener('click', () => { setFilter(b.dataset.f); go(0, 1, true); }));
    $('.sn-prev').addEventListener('click', () => go(idx - 1, -1, true));
    $('.sn-next').addEventListener('click', () => go(idx + 1, 1, true));
    // arrastrar el riel con el mouse
    let dx = 0, sl = 0, down = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; rail.moved = false; dx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - dx; if (Math.abs(d) > 5) { rail.moved = true; rail.classList.add('drag'); } rail.scrollLeft = sl - d; });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('drag'); setTimeout(() => rail.moved = false, 50); });
    // inclinación 3D del paquete con el mouse
    const bagWrap = $('.stage-bag');
    bagWrap.addEventListener('pointermove', e => { const r = bagWrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 16}deg)`; });
    bagWrap.addEventListener('pointerleave', () => card.style.transform = '');
    // swipe en celular
    let sx0 = null;
    bagWrap.addEventListener('touchstart', e => sx0 = e.touches[0].clientX, { passive: true });
    bagWrap.addEventListener('touchend', e => { if (sx0 === null) return; const d = e.changedTouches[0].clientX - sx0; if (Math.abs(d) > 40) go(idx + (d < 0 ? 1 : -1), d < 0 ? 1 : -1, true); sx0 = null; });
    new IntersectionObserver(es => { inView = es[0].isIntersecting; restartAuto(); }, { threshold: .3 }).observe(stage);
    imgs[0].src = D.cafes[0].img; go(0, 1, 'init');

    /* ---------- tés ---------- */
    const teas = $('#tes'), tl = $('.tea-list'), timg = $('.tea-img'), tinfo = $('.tea-info');
    let ti = 0, tAuto = null, tIdle = 0, tIn = false;
    D.tes.forEach((t, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.textContent = t.nombre; b.style.setProperty('--dot', t.color); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { tIdle = performance.now(); pickTea(i); });
      li.appendChild(b); tl.appendChild(li);
    });
    const leaves = $('.tea-leaves');
    for (let i = 0; i < 10; i++) { const l = document.createElement('i'); l.className = 'leaf'; l.style.cssText = `left:${10 + Math.random() * 80}%;top:${55 + Math.random() * 40}%;--d:${7 + Math.random() * 6}s;--dl:${-Math.random() * 10}s;--x:${(Math.random() - .5) * 160}px`; leaves.appendChild(l); }
    function pickTea(i) {
      ti = (i + D.tes.length) % D.tes.length; const t = D.tes[ti];
      teas.style.setProperty('--t', t.color);
      $$('button', tl).forEach((b, k) => b.setAttribute('aria-pressed', String(k === ti)));
      timg.classList.add('swap'); tinfo.classList.add('swap');
      setTimeout(() => {
        timg.src = `assets/drupa/${t.id}.webp`; timg.alt = 'Té Inti Zen ' + t.nombre;
        $('.ti-base').textContent = t.base; $('.ti-name').textContent = t.nombre; $('.ti-con').textContent = 'Con ' + t.con.charAt(0).toLowerCase() + t.con.slice(1) + '.';
        $('.ti-txt').textContent = t.txt; $('.ti-num').textContent = fmt(D.tePrecio);
        timg.onload = () => timg.classList.remove('swap'); setTimeout(() => timg.classList.remove('swap'), 400);
        tinfo.classList.remove('swap');
      }, 350);
      schedTea();
    }
    function schedTea() { clearTimeout(tAuto); tAuto = setTimeout(() => { if (tIn && performance.now() - tIdle > 10000) pickTea(ti + 1); else schedTea(); }, 5000); }
    new IntersectionObserver(es => tIn = es[0].isIntersecting, { threshold: .3 }).observe(teas);
    const tbox = $('.tea-box'), tstage = $('.tea-stage');
    tstage.addEventListener('pointermove', e => { const r = tstage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; tbox.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 18}deg)`; });
    tstage.addEventListener('pointerleave', () => tbox.style.transform = '');
    pickTea(0);
  }

  /* =========================================================
     MENÚ CELULAR + ANCLAS
     ========================================================= */
  const menu = $('#menu'), menuBtn = $('#menu-btn');
  let menuOpen = false;
  const setMenu = o => { menuOpen = o; menu.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); menu.setAttribute('aria-hidden', String(!o)); };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); setMenu(false);
    let top = t.offsetTop;
    if (t.classList.contains('seq-section')) top += (t.offsetHeight - vh) * .35; // aterrizar con el video ya en marcha
    scrollTo({ top, behavior: 'smooth' });
  }));
})();
