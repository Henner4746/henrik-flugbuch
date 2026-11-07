(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches && !location.search.includes('motion');
const small = Math.min(innerWidth, innerHeight) < 700 || /Mobi|Android/i.test(navigator.userAgent);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

/* ---------- language ---------- */
let lang = store.get('fb-lang') || ((navigator.language || 'de').startsWith('de') ? 'de' : 'en');
const T = {
  de: { addr: 'Beispieladresse', press: '> ? <', reset: 'Reset', loading: 'Lade Terrain',
    vid: ['Video: An', 'Video: Aus'],
    rate: [['Butterweich', 'Die Passagiere klatschen.'], ['Ordentlich gelandet', 'Kaum zu spüren.'], ['Harte Landung', 'Die Gepäckfächer sind aufgegangen.'], ['Einschlag', 'Der Flugschreiber hat alles gesehen.']],
    tele: (v, t) => `${v} m/s beim Aufsetzen, ${t} Flugzeit.`, jump: 'Willkommen am Boden',
    k: { autopilot: 'Autopilot', jump: 'Springen', sneak: 'Schleichen', sprint: 'Sprinten', inv: 'Inventar' }, saved: 'gespeichert', tools: 'WERKZEUGE' },
  en: { addr: 'Example address', press: '> ? <', reset: 'Reset', loading: 'Loading terrain',
    vid: ['Video: On', 'Video: Off'],
    rate: [['Butter', 'The passengers applaud.'], ['Solid landing', 'Barely felt it.'], ['Hard landing', 'The overhead bins came open.'], ['Impact', 'The flight recorder saw everything.']],
    tele: (v, t) => `${v} m/s at touchdown, ${t} of flight.`, jump: 'Welcome on the ground',
    k: { autopilot: 'Autopilot', jump: 'Jump', sneak: 'Sneak', sprint: 'Sprint', inv: 'Inventory' }, saved: 'saved', tools: 'TOOLS' }
};
const t = k => T[lang][k];
$$('[data-en]').forEach(e => { e.dataset.de = e.innerHTML; });
const onLang = [];
function setLang(l) {
  lang = l; document.documentElement.lang = l; store.set('fb-lang', l);
  $$('[data-en]').forEach(e => { e.innerHTML = e.dataset[l]; });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === l));
  $('#addr').setAttribute('aria-label', t('addr'));
  onLang.forEach(f => f()); layout();
}
$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.l)));

/* ---------- altitude from scroll ---------- */
const stops = $$('[data-alt]'), projs = $$('.proj').map(el => ({ el, id: el.id, layer: el.dataset.layer ? document.getElementById(el.dataset.layer) : null, w: 0, p: 0 }));
let anchors = [], vh = innerHeight, touchY = 1e9;
function layout() {
  vh = innerHeight;
  anchors = stops.map((s, i) => ({ y: i ? s.offsetTop : 0, a: +s.dataset.alt, id: s.id, wp: s.dataset.wp }));
  touchY = $('#terminal').offsetTop - vh * .12; anchors[anchors.length - 1].y = touchY;
}
function altAt(y) {
  if (y >= touchY) return 0;
  for (let i = 0; i < anchors.length - 1; i++) { const A = anchors[i], B = anchors[i + 1];
    if (y <= B.y) { const u = clamp((y - A.y) / (B.y - A.y), 0, 1); return Math.exp(lerp(Math.log(A.a + 20), Math.log(B.a + 20), u)) - 20; } }
  return 0;
}

/* ---------- HUD: FlightAssistant's layout, drawn only in its section ---------- */
const hud = $('#hud'), hc = hud.getContext('2d');
let HW = 0, HH = 0;
function sizeHud() { const d = Math.min(devicePixelRatio || 1, 2); HW = innerWidth; HH = innerHeight; hud.width = HW * d; hud.height = HH * d; hud.style.height = HH + 'px'; hc.setTransform(d, 0, 0, d, 0, 0); }
const fmtAlt = a => a >= 10000 ? (a / 1000).toLocaleString(lang, { maximumFractionDigits: a >= 100000 ? 0 : 1 }) + ' km' : Math.round(a / (a > 500 ? 10 : 1)) * (a > 500 ? 10 : 1) + ' m';
function drawMini(s) {
  const c = hc; c.font = '700 14px "B612 Mono",monospace'; c.textAlign = 'right'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.6)'; c.fillStyle = '#fff3e2';
  const tx = fmtAlt(s.alt); c.strokeText(tx, HW - 18, HH - 20); c.fillText(tx, HW - 18, HH - 20);
}
function drawFA(s, a) {
  const c = hc, W = HW, H = HH, G = '#3dff6e', nar = W < 700; c.save(); c.globalAlpha = a; c.strokeStyle = c.fillStyle = G; c.lineWidth = 2; c.font = `400 ${nar ? 14 : 18}px "Pixelify Sans",monospace`;
  const m = nar ? 8 : Math.max(24, W * .05), top = H * .2, bot = H * .78, cy = (top + bot) / 2, tw = nar ? 34 : 54;
  const tape = (x, dir, val, step, lab) => {   /* dir -1: ticks left of the line */
    c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.moveTo(x, top); c.lineTo(x + -dir * tw, top); c.moveTo(x, bot); c.lineTo(x + -dir * tw, bot); c.stroke();
    c.textAlign = dir > 0 ? 'left' : 'right'; const px = (bot - top) / (step * 6.5), base = Math.round(val / step) * step;
    c.save(); c.beginPath(); c.rect(Math.min(x, x + dir * 120) - 2, top + 2, 124, bot - top - 4); c.clip();
    for (let i = -7; i <= 7; i++) { const v = base + i * step, y = cy - (v - val) * px; if (v < 0) continue; const big = (v / step) % 2 === 0;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * (big ? 12 : 7), y); c.stroke(); if (big) c.fillText(v, x + dir * 18, y + 6); }
    c.restore();
    const bw = nar ? 58 : 84, bx = dir > 0 ? x + 2 : x - bw - 2; c.fillStyle = '#000b'; c.fillRect(bx, cy - 17, bw, 34); c.fillStyle = G; c.strokeRect(bx, cy - 17, bw, 34); c.textAlign = 'center'; c.fillText(Math.round(lab), bx + bw / 2, cy + 7);
  };
  tape(m + tw, -1, s.spd, 5, s.spd); tape(W - m - tw, 1, s.alt, 100, s.alt);
  /* ladder */
  const hx = W / 2, deg = H / 62; c.save(); c.translate(hx, cy); c.rotate(s.roll); c.translate(0, s.pitch * deg); c.textAlign = 'center';
  for (const d of [-30, -15, 0, 15, 30]) { const y = -d * deg, w = d ? W * .08 : W * .14, g = W * .025; c.setLineDash(d < 0 ? [10, 8] : []);
    c.beginPath(); c.moveTo(-g - w, y); c.lineTo(-g, y); c.moveTo(g, y); c.lineTo(g + w, y); c.stroke(); c.setLineDash([]); if (!nar) { c.fillText(d, -g - w - 18, y + 6); c.fillText(d, g + w + 18, y + 6); } }
  c.restore();
  /* flight path marker */
  const fx = hx + s.fx * .5, fy = cy + s.fy * .5; c.beginPath(); c.rect(fx - 6, fy - 6, 12, 12); c.moveTo(fx - 6, fy); c.lineTo(fx - 18, fy); c.moveTo(fx + 6, fy); c.lineTo(fx + 18, fy); c.moveTo(fx, fy - 6); c.lineTo(fx, fy - 14); c.stroke();
  /* heading */
  const hy = bot + 26, hw = Math.min(W * .34, 300), hd = (s.hdg % 360 + 360) % 360; c.beginPath(); c.moveTo(hx - hw, hy + 30); c.lineTo(hx - hw, hy); c.lineTo(hx + hw, hy); c.lineTo(hx + hw, hy + 30); c.stroke();
  c.textAlign = 'center'; c.save(); c.beginPath(); c.rect(hx - hw + 2, hy, hw * 2 - 4, 40); c.clip();
  for (let i = -6; i <= 6; i++) { const v = Math.round(hd / 10) * 10 + i * 10, x = hx + (v - hd) * (hw / 50); c.beginPath(); c.moveTo(x, hy); c.lineTo(x, hy + (v % 30 ? 6 : 10)); c.stroke(); if (v % 30 === 0) c.fillText((v + 360) % 360, x, hy + 28); }
  c.restore(); c.fillStyle = '#000b'; c.fillRect(hx - 28, hy - 2, 56, 26); c.fillStyle = G; c.strokeRect(hx - 28, hy - 2, 56, 26); c.fillText(Math.round(hd), hx, hy + 17);
  /* readouts */
  if (!nar) { c.textAlign = 'right'; c.fillStyle = '#fff'; c.fillText('FRWK CNT: 638', W - m - tw - 110, top + 22); c.fillText('THR: ' + (s.ap ? '100.0%' : '0.0%'), W - m - tw - 110, top + 44); c.fillStyle = G;
    c.fillText('G/S: ' + Math.round(s.spd), W - m - tw - 110, bot - 26); c.fillText('V/S: ' + Math.round(s.vs), W - m - tw - 110, bot - 4); }
  c.restore();
}

/* ---------- 3D ---------- */
let gl = null;
function initGL() {
  if (!window.THREE) return null;
  const THREE = window.THREE, cv = $('#world');
  let r; try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: !small, powerPreference: 'high-performance' }); } catch { return null; }
  r.autoClear = false; r.setClearColor(0x05061a, 1);
  const size = () => { r.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5)); r.setSize(innerWidth, innerHeight, false); pc.aspect = wc.aspect = innerWidth / innerHeight; pc.updateProjectionMatrix(); wc.updateProjectionMatrix(); };

  const hash = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
  const fbm = (x, y, o = 5) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= .5; } return s; };
  const ridge = (x, y) => { let s = 0, a = .55, p = 1; for (let i = 0; i < 5; i++) { const n = 1 - Math.abs(vn(x, y) * 2 - 1); s += a * n * n * p; p = n; x *= 2.1; y *= 2.1; a *= .5; } return s; };

  /* planet */
  const ps = new THREE.Scene(), pc = new THREE.PerspectiveCamera(35, 1, 1, 12000), R = 100;
  const pg = new THREE.Group(); ps.add(pg);
  ps.add(new THREE.AmbientLight(0x4a3a8a, .55));
  const sunP = new THREE.DirectionalLight(0xfff1dc, 1.5); ps.add(sunP);
  const rim = new THREE.DirectionalLight(0xff5a2a, .5); ps.add(rim);
  pg.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshPhongMaterial({ color: 0x0a2a63, emissive: 0x030722, specular: 0x34406e, shininess: 18 })));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: 'varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}',
    fragmentShader: 'uniform vec3 uSun;varying vec3 vN;varying vec3 vW;void main(){vec3 v=normalize(cameraPosition-vW);float f=pow(clamp(1.-abs(dot(vN,v)),0.,1.),.9);float s=dot(normalize(vW),uSun);float lit=smoothstep(-.35,.5,s);vec3 c=mix(vec3(1.,.32,.12),vec3(.33,.55,1.),smoothstep(.0,.7,s));gl_FragColor=vec4(c,pow(1.-f,3.)*lit*1.6);}'
  }));
  ps.add(atmo);
  { const n = 2600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(6000); p.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); ps.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff3e2, size: 1.6, sizeAttenuation: false }))); }
  const PAL = [0, 0x12b76a, 0x19c37d, 0x4ed17a, 0xffb54a, 0xf2955b, 0xffcc66, 0xe9b872, 0xb7d84b, 0xa8d04a, 0x98c84a, 0x7ed957, 0x70d05a, 0x62c85c, 0x35c28a, 0x2fb88e, 0x29ae92, 0x1e9a8a, 0x1e9a8a, 0x1e948c, 0x1d8e8e, 0x1d8890, 0x1c8292, 0x1c7c94, 0x1b7696, 0x1b7098, 0x1a6a9a, 0x1a649c, 0x1a5e9e, 0xa9c8e8, 0xf4f7ff];
  const img = new Image(); img.src = 'assets/koppen-480.png';
  img.onload = () => {
    const W = img.width, H = img.height, c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.drawImage(img, 0, 0);
    const d = x2.getImageData(0, 0, W, H).data, st = small ? 2 : 1, cells = [];
    for (let j = 0; j < H; j += st) for (let i = 0; i < W; i += st) { const k = d[(j * W + i) * 4]; if (k) cells.push([j, i, k]); }
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), cells.length);
    const o = new THREE.Object3D(), col = new THREE.Color(), w = 360 / W * st * Math.PI / 180 * R;
    cells.forEach(([j, i, k], n) => {
      const lat = (90 - (j + st / 2) * 180 / H) * Math.PI / 180, lon = ((i + st / 2) * 360 / W - 180) * Math.PI / 180;
      const p = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      const base = k >= 29 ? (k === 30 ? 1.7 : 1) : k >= 17 ? .8 : k >= 4 && k <= 7 ? .45 : .6, h = base + hash(i, j) * .55;
      o.position.copy(p).multiplyScalar(R + h / 2 - .1); o.up.set(0, 1, 0); o.lookAt(p.clone().multiplyScalar(R * 3));
      o.scale.set(Math.max(w * Math.cos(lat) * .99, .25), w * .99, h); o.updateMatrix(); m.setMatrixAt(n, o.matrix);
      col.setHex(PAL[k]); col.offsetHSL(0, 0, (hash(j, i) - .5) * .05); m.setColorAt(n, col);
    });
    m.instanceColor.needsUpdate = true; m.frustumCulled = false; pg.add(m);
    const nC = small ? 200 : 520, cm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .82 }), nC);
    for (let n = 0; n < nC; n++) { const lat = Math.asin(Math.random() * 1.8 - .9), lon = Math.random() * 6.283, p = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      o.position.copy(p).multiplyScalar(R + 3); o.up.set(0, 1, 0); o.lookAt(p.clone().multiplyScalar(R * 3)); o.scale.set(.9 + Math.random() * 2.6, .7 + Math.random() * 1.5, .3); o.updateMatrix(); cm.setMatrixAt(n, o.matrix); }
    cm.frustumCulled = false; pg.add(cm);
  };

  /* world */
  const ws = new THREE.Scene(), wc = new THREE.PerspectiveCamera(62, 1, 2, 260000); wc.rotation.order = 'YXZ';
  ws.fog = new THREE.Fog(0xff7a3c, 3000, 20000);
  const sunDir = new THREE.Vector3(.16, .06, -1).normalize();
  const sl = new THREE.DirectionalLight(0xffb27a, 1.25); sl.position.copy(sunDir); ws.add(sl);
  const fill = new THREE.DirectionalLight(0x9a7ae0, .55); fill.position.set(-.3, .5, 1); ws.add(fill);
  const hemi = new THREE.HemisphereLight(0xffb79a, 0x3a1d5e, .85); ws.add(hemi);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200000, 32, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uHigh: { value: 0 }, uAlpha: { value: 1 }, uNight: { value: 0 }, uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uHigh,uAlpha,uNight;uniform vec3 uSun;varying vec3 vD;
      float h(vec3 p){return fract(sin(dot(p,vec3(12.98,78.23,37.72)))*43758.5);}
      void main(){vec3 d=normalize(vD);float e=d.y;float x=clamp(e*mix(1.,5.,uHigh),0.,1.);
      vec3 cH=vec3(1.,.40,.15),c1=vec3(.86,.17,.31),c2=vec3(.27,.10,.42),c3=vec3(.06,.045,.19);
      vec3 col=mix(cH,c1,smoothstep(.0,.11,x));col=mix(col,c2,smoothstep(.09,.34,x));col=mix(col,c3,smoothstep(.3,.85,x));
      col=mix(col,vec3(.008,.01,.045),uHigh*smoothstep(.02,.45,x));
      vec3 below=mix(cH*.72,vec3(.10,.05,.18),smoothstep(0.,-.22,e));col=e<0.?below:col;
      float g=max(dot(d,uSun),0.);col+=vec3(1.,.55,.25)*pow(g,14.)*.42+vec3(1.,.8,.5)*pow(g,120.)*.5;
      vec3 sx=normalize(cross(uSun,vec3(0.,1.,0.))),sy=cross(sx,uSun);float a=abs(dot(d,sx)),b=abs(dot(d,sy));
      if(dot(d,uSun)>0.&&max(a,b)<.026)col=mix(col,vec3(1.,.93,.62),.96);
      vec3 nc=mix(vec3(.05,.06,.11),vec3(.012,.014,.03),smoothstep(0.,.5,abs(e)));col=mix(col,nc,uNight);
      vec3 q=floor(d*420.);float st=step(.9975,h(q))*smoothstep(.04,.4,e)*max(.35+.65*uHigh,uNight);col+=st*.8;
      gl_FragColor=vec4(col,uAlpha);}`
  })); sky.frustumCulled = false; const skyS = new THREE.Scene(); skyS.add(sky);

  const clouds = new THREE.Group(); ws.add(clouds);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x5a2a4a, emissiveIntensity: .32 });
  function deck(y, cell, x0, x1, z0, z1, thr, sc, th, lo, hi) {
    const list = [], st = small ? 1.5 : 1, step = cell * st;
    for (let x = x0; x < x1; x += step) for (let z = z0; z < z1; z += step) { const n = fbm(x * sc, z * sc, 4); if (n > thr) { const L = 1 + (n > thr + .03) + (n > thr + .065) + (n > thr + .1); for (let l = 0; l < L; l++) list.push([x, z, l]); } }
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cloudMat, list.length), o = new THREE.Object3D(), c = new THREE.Color(), a = new THREE.Color(lo), b = new THREE.Color(hi);
    list.forEach(([x, z, l], i) => { o.position.set(x, y + l * th, z); o.scale.set(step * 1.01, th, step * 1.01); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      c.copy(a).lerp(b, clamp((l + 1) / 4 + (hash(x | 0, z | 0) - .5) * .22, 0, 1)); m.setColorAt(i, c); });
    m.instanceColor.needsUpdate = true; m.frustumCulled = false; clouds.add(m);
  }
  deck(1800, 400, -46000, 46000, -70000, 42000, .515, 1 / 6000, 110, 0xf08a6c, 0xfff0e4);
  deck(13600, 1000, -60000, 60000, -90000, 30000, .545, 1 / 15000, 240, 0x6a3a86, 0xe88aa0);
  deck(640, 150, -9000, 9000, -8000, 11000, .63, 1 / 2400, 46, 0xe07a70, 0xffd9c8);

  /* terrain */
  const mean = z => 900 * Math.sin(z / 2300) * sstep(2600, 6500, Math.abs(z));
  const hAt = (x, z) => { const d = Math.abs(x - mean(z)), ramp = sstep(420, 4400, d), rr = ridge(x / 5200 + 7, z / 5200 + 3); return ramp * (rr * 3300 + 40) + sstep(300, 1400, d) * fbm(x / 900, z / 900, 3) * 90; };
  const cell = small ? 260 : 120, X = 15000, Z0 = -19000, Z1 = 13000, cols = [];
  const tc = (h, x, z) => { const n = fbm(x / 420, z / 420, 3);
    if (h < 8) return n > .56 ? 0x2aa374 : n > .46 ? 0x1f9069 : 0x18805f; if (h < 90) return n > .5 ? 0x167a60 : 0x106a58; if (h < 520) return n > .52 ? 0x0f5f55 : 0x136a58;
    if (h < 1050) return 0x4a3a78; if (h < 1500) return 0x6a4a8c; return n > .46 ? 0xffe0d0 : 0xf2bfc4; };
  for (let x = -X; x < X; x += cell) for (let z = Z0; z < Z1; z += cell) { const hh = hAt(x, z), q = hh < 160 ? 16 : 40; cols.push([x, z, Math.round(hh / q) * q]); }
  const terr = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), cols.length);
  const o3 = new THREE.Object3D(), col3 = new THREE.Color();
  cols.forEach(([x, z, h], i) => { const H = h + 500; o3.position.set(x, h - H / 2, z); o3.scale.set(cell, H, cell); o3.updateMatrix(); terr.setMatrixAt(i, o3.matrix);
    const riv = Math.abs(x - (mean(z) + 760 + 150 * Math.sin(z / 800))) < cell * .55 && h < 70; col3.setHex(riv ? 0xffb27a : tc(h, x, z)); if (!riv) col3.offsetHSL(0, 0, (hash(x | 0, z | 0) - .5) * .05); terr.setColorAt(i, col3); });
  terr.instanceColor.needsUpdate = true; terr.frustumCulled = false; ws.add(terr);
  const TC = [0x0f5a4a, 0x0c4d46, 0x156a52, 0x0f5a4a, 0x0c4d46, 0xd9603a, 0xe8a53a, 0x8a3a5a], tl = [], nT = small ? 2600 : 9000;
  for (let i = 0; tl.length < nT && i < nT * 6; i++) { const x = (hash(i, 11) - .5) * 15000, z = lerp(-11000, 10500, hash(i, 29)), h = hAt(x, z); if (h > 620 || Math.abs(x) < 130 || fbm(x / 1100, z / 1100, 2) < .34) continue; tl.push([x, z, h]); }
  const trees = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), tl.length);
  tl.forEach(([x, z, h], i) => { const w = 14 + hash(i, 3) * 20, H = 16 + hash(i, 5) * 24; o3.position.set(x, h + H / 2, z); o3.scale.set(w, H, w); o3.updateMatrix(); trees.setMatrixAt(i, o3.matrix); col3.setHex(TC[hash(i, 7) * TC.length | 0]); trees.setColorAt(i, col3); });
  trees.instanceColor.needsUpdate = true; trees.frustumCulled = false; ws.add(trees);

  /* runway */
  const RL = 3000, RW = 64, rc = document.createElement('canvas'); rc.width = 256; rc.height = 4096;
  const runwayTex = new THREE.CanvasTexture(rc); runwayTex.anisotropy = r.capabilities.getMaxAnisotropy();
  function paintRunway() {
    const c = rc.getContext('2d'), W = rc.width, H = rc.height; c.fillStyle = '#26222e'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; c.fillRect(Math.random() * W, Math.random() * H, 3, 40); }
    c.fillStyle = '#fff3e2'; c.fillRect(6, 0, 4, H); c.fillRect(W - 10, 0, 4, H);
    for (let i = 0; i < 12; i++) if (i !== 5 && i !== 6) c.fillRect(16 + i * 19, H - 90, 11, 74);
    c.save(); c.translate(W / 2, H - 112); c.scale(1, 3.6); c.textAlign = 'center'; c.font = '900 96px "Big Shoulders Display",sans-serif'; c.fillText('HENRIK', 0, 0, W - 34); c.restore();
    for (let y = H - 520; y > 40; y -= 66) c.fillRect(W / 2 - 2, y - 36, 4, 36);
    runwayTex.needsUpdate = true;
  }
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(RW, RL), new THREE.MeshBasicMaterial({ map: runwayTex, fog: true }));
  rw.rotation.x = -Math.PI / 2; rw.position.set(0, .8, -RL / 2); ws.add(rw);
  { const pts = [], cs = [], add = (x, y, z, c) => { pts.push(x, y, z); cs.push(c[0], c[1], c[2]); }, Wh = [1, .95, .8], G = [.3, 1, .6], Rd = [1, .2, .15];
    for (let z = 0; z > -RL; z -= 60) { add(-RW / 2 - 2, 2, z, Wh); add(RW / 2 + 2, 2, z, Wh); }
    for (let x = -RW / 2; x <= RW / 2; x += 6) { add(x, 2, 2, G); add(x, 2, -RL, Rd); }
    for (let z = 40; z < 900; z += 40) for (const x of [-8, -4, 0, 4, 8]) add(x, 3, z, Wh);
    for (let i = 0; i < 4; i++) add(-RW / 2 - 18 - i * 9, 3, -300, i < 2 ? Wh : Rd);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
    const l = new THREE.Points(g, new THREE.PointsMaterial({ size: small ? 3 : 4, sizeAttenuation: false, vertexColors: true, fog: false })); l.frustumCulled = false; ws.add(l); }

  const API = { paintRunway,
    frame(s, dt, time) {
      const a = s.alt, la = Math.log(a + 20), wW = 1 - sstep(Math.log(32000), Math.log(120000), la);
      r.clear();
      if (wW < .995) {
        const q = clamp(a / 400000, 0, 1), asp = pc.aspect, D = R + 235 * (asp < .8 ? 2.5 : 1) * q * q + .42, n = new THREE.Vector3(0, 0, 1), k = 1 - sstep(Math.log(60000), Math.log(330000), la);
        pc.position.copy(n).multiplyScalar(D);
        const hero = (asp < 1 ? new THREE.Vector3(0, -55, 0) : new THREE.Vector3(-46, 6, 0)).sub(pc.position).normalize(), tan = new THREE.Vector3(0, 1, -.03).normalize();
        const dir = hero.clone().lerp(tan, k).normalize(), up = new THREE.Vector3(0, 1, 0).lerp(n, k).normalize();
        pc.up.copy(up); pc.lookAt(pc.position.clone().add(dir)); pc.rotateZ(s.roll * .5);
        const sd = new THREE.Vector3(-.28, 1, .42).lerp(new THREE.Vector3(.16, 1, .05), k).normalize();
        sunP.position.copy(sd); rim.position.set(.8, -.2, .6); atmo.material.uniforms.uSun.value.copy(sd);
        pg.rotation.y = (calm ? 0 : time * .012) - .5 + k * .6; pg.rotation.x = .42;
        r.render(ps, pc); r.clearDepth();
      }
      if (wW > .005) {
        const high = sstep(Math.log(9000), Math.log(90000), la), N = s.night;
        const u = sky.material.uniforms; u.uHigh.value = high; u.uAlpha.value = wW; u.uNight.value = N;
        const z = a < 3000 ? 6 * a - 300 : 17700 + (a - 3000) * .4, rz = s.touched ? -s.rollout : 0;
        wc.position.set(s.bankX, Math.max(a, 0) + 5 + s.shake, z + rz); sky.position.copy(wc.position);
        wc.rotation.set(-.028 - high * .05 + s.pitch * Math.PI / 180, s.yaw, s.roll);
        wc.near = clamp(a * .01, 1.5, 300); wc.updateProjectionMatrix();
        const far = 17000 + a * 2.6; ws.fog.far = far; ws.fog.near = far * .16;
        ws.fog.color.setRGB(lerp(lerp(.98, .24, high), .05, N), lerp(lerp(.42, .10, high), .06, N), lerp(lerp(.2, .3, high), .11, N));
        sl.intensity = lerp(1.25, .08, N); fill.intensity = lerp(.55, .2, N); hemi.intensity = lerp(.85, .22, N); cloudMat.emissiveIntensity = lerp(.32, .05, N);
        clouds.visible = a < 70000; terr.visible = rw.visible = trees.visible = a < 2600;
        r.render(skyS, wc); r.clearDepth(); r.render(ws, wc);
      }
    }
  };
  addEventListener('resize', size); size();
  return API;
}
gl = initGL();
if (!gl) document.documentElement.classList.add('no-gl');

/* ---------- flight state ---------- */
const S = { alt: 400000, vs: 0, roll: 0, pitch: 0, yaw: 0, fx: 0, fy: 0, shake: 0, shakeT: 0, touched: 0, rollout: 0, bankX: 0, night: 0, spd: 0, hdg: 178, ap: false };
let mx = .5, my = .5, startedAt = null, landed = null, wasHigh = false, dirTo = null, ap = false, apY = 0, apTimer = 0, alertUntil = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });

const apBtn = $('#ap');
function setAP(on, quiet) { if (on === ap) return; ap = on; S.ap = on; apBtn.setAttribute('aria-pressed', on); apBtn.classList.toggle('off', !on && !quiet); clearTimeout(apTimer); if (!on && !quiet) apTimer = setTimeout(() => apBtn.classList.remove('off'), 2200); if (on) { apY = scrollY; dirTo = null; } }
apBtn.addEventListener('click', () => setAP(!ap));
['wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (ap) setAP(false); dirTo = null; }, { passive: true }));
function go(y) { if (calm) { scrollTo(0, y); return; } dirTo = { from: scrollY, to: y, t: 0, d: clamp(Math.abs(y - scrollY) / 3000, .9, 3) }; }
$$('[data-go]').forEach(a => a.addEventListener('click', e => { const id = a.dataset.go, s = document.getElementById(id); e.preventDefault(); setAP(false, true); closePlan();
  go(id === 'orbit' ? 0 : id === 'terminal' ? s.offsetTop + vh * .3 : s.offsetTop + vh * .32); }));
$('#again').addEventListener('click', () => { startedAt = null; landed = null; wasHigh = false; go(0); });
const planBtn = $('#planbtn'), routeEl = $('#route');
function closePlan() { routeEl.classList.remove('open'); planBtn.setAttribute('aria-expanded', 'false'); }
planBtn.addEventListener('click', () => { const o = routeEl.classList.toggle('open'); planBtn.setAttribute('aria-expanded', o); });

/* ---------- SaveMyKeybinds: a working key list ---------- */
const PRESETS = { Standard: { autopilot: 'A', jump: 'Space', sneak: 'Shift', sprint: 'Control', inv: 'E' }, PvP: { autopilot: 'P', jump: 'Space', sneak: 'C', sprint: 'R', inv: 'Tab' } };
let keys = { ...PRESETS.Standard }, presetName = 'Standard', waiting = null;
try { const m = JSON.parse(store.get('fb-keys') || 'null'); if (m) { PRESETS.Meins = m; keys = { ...m }; presetName = 'Meins'; } } catch {}
const klist = $('#klist');
function paintKeys() {
  klist.innerHTML = Object.keys(keys).map(k => `<li class="${k === 'autopilot' ? 'real' : ''}"><span>${t('k')[k]}</span><button class="mc ${waiting === k ? 'wait' : ''}" type="button" data-k="${k}">${waiting === k ? t('press') : keys[k]}</button><button class="mc rs" type="button" data-r="${k}">${t('reset')}</button></li>`).join('');
  $('#apk').textContent = keys.autopilot.length === 1 ? keys.autopilot : 'A';
  $('#kfile').textContent = `config/savemykeybinds/${presetName}.json`;
}
klist.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) { waiting = b.dataset.k; } if (b.dataset.r) { keys[b.dataset.r] = PRESETS.Standard[b.dataset.r]; waiting = null; } paintKeys(); });
$('#k-save').addEventListener('click', () => { PRESETS.Meins = { ...keys }; presetName = 'Meins'; store.set('fb-keys', JSON.stringify(keys)); paintKeys(); $('#kfile').textContent += ' · ' + t('saved'); });
$('#k-load').addEventListener('click', () => { const n = Object.keys(PRESETS), i = (n.indexOf(presetName) + 1) % n.length; presetName = n[i]; keys = { ...PRESETS[presetName] }; paintKeys(); });
onLang.push(paintKeys);
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey && !waiting || e.altKey) return;
  if (waiting) { e.preventDefault(); if (e.key !== 'Escape') keys[waiting] = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key; waiting = null; paintKeys(); return; }
  if (e.target.closest && e.target.closest('button,a') && e.key === ' ') return;
  if (e.key.toUpperCase() === keys.autopilot.toUpperCase()) setAP(!ap);
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) { if (ap) setAP(false); dirTo = null; }
});

/* alerts */
const alertEl = $('#alert');
function setAlert(k) { if (!k) { alertEl.hidden = true; return; } alertEl.hidden = false; alertEl.className = k === 'PULL UP' ? '' : 'c'; alertEl.textContent = k; }
$('#gpws').addEventListener('click', () => { alertUntil = performance.now() + 2600; });

/* landing */
function clock(ms) { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function showRating() { const el = $('#rate'); if (!landed) return; if (landed.jump) { el.innerHTML = `<b>${t('jump')}</b>`; return; }
  const [a, b] = t('rate')[landed.i]; el.innerHTML = `<b>${a}</b>${b} ${t('tele')(landed.v.toLocaleString(lang, { maximumFractionDigits: 1 }), clock(landed.ms))}`; }
onLang.push(showRating);

/* BitDM address, real format: base32(pubkey[32] + sha256(pubkey)[:3]), groups of four */
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
async function newAddress() {
  const pk = crypto.getRandomValues(new Uint8Array(32)); let sum = new Uint8Array(3);
  try { sum = new Uint8Array(await crypto.subtle.digest('SHA-256', pk)).slice(0, 3); } catch { crypto.getRandomValues(sum); }
  const all = new Uint8Array(35); all.set(pk); all.set(sum, 32);
  let bits = 0, v = 0, out = ''; for (const b of all) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } v &= (1 << bits) - 1; }
  return out;
}
const addrEl = $('#addr');
function paintAddr(a) { const n = a.length - 5; addrEl.innerHTML = (a.match(/.{4}/g) || []).map((g, i) => `<span>${[...g].map((ch, j) => (i * 4 + j >= n ? `<em>${ch}</em>` : ch)).join('')}</span>`).join(''); }
async function regen() { const a = await newAddress(); if (calm) return paintAddr(a); let f = 0; const id = setInterval(() => { f++; const keep = Math.floor(f / 12 * 56); paintAddr([...a].map((ch, i) => i < keep ? ch : B32[Math.random() * 32 | 0]).join('')); if (f >= 12) { clearInterval(id); paintAddr(a); } }, 42); }
regen(); $('#regen').addEventListener('click', regen);

/* departures board */
const FIDS = [
  ['cc-chat-export', ['Claude-Code-Chats als sauberes Markdown', 'Claude Code chats as clean Markdown'], 'RUST', 'V0.1.0', 'V0.1.0', 'ok', '02.11.'],
  ['claude-code-api-cost', ['Knopf in Claude Desktop: API-Kosten pro Modell', 'Button in Claude Desktop: API cost per model'], 'TYPESCRIPT', 'PLUGIN', 'PLUGIN', 'ok', '17.10.'],
  ['google-photos-sync-rs', ['Foto-Backup ohne doppelte Uploads, 2 MiB nativ', 'Photo backup with no duplicate uploads, 2 MiB native'], 'RUST', 'V2 IN ARBEIT', 'V2 IN WORK', 'wip', '13.08.'],
  ['scoop-bitdm', ['BitDM per Scoop installieren', 'Install BitDM with Scoop'], 'POWERSHELL', 'BUCKET', 'BUCKET', 'ok', '24.10.'],
  ['salsanow-session-guide', ['SalsaNOW-Hilfe und sichere LM-Studio-Starter', 'SalsaNOW help and secure LM Studio starters'], 'PYTHON', 'GUIDE', 'GUIDE', 'ok', '03.10.'],
  ['searxng-log-viewer', ['Lokales Dashboard für SearXNG-Logs', 'Local dashboard for SearXNG logs'], 'PYTHON', 'QUELLCODE', 'SOURCE', 'ok', '27.07.'],
  ['opencode-chat-exporter', ['OpenCode-Sessions als Markdown, Tray-App', 'OpenCode sessions as Markdown, tray app'], 'POWERSHELL', 'QUELLCODE', 'SOURCE', 'ok', '27.07.'],
  ['asus-tuf-f17-trackpad-fix', ['Offline-Reparatur fürs ELAN-Touchpad', 'Offline repair for the ELAN touchpad'], 'POWERSHELL', 'PAKET', 'PACKAGE', 'ok', '27.07.']
];
const tb = $('#fids'), flaps = s => [...s].map(c => `<span class="fl">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
function paintBoard() { const e = lang === 'en'; tb.innerHTML = FIDS.map(([n, w, l, d1, d2, k, d]) => `<tr><td><a href="https://github.com/Henner4746/${n}" aria-label="${n}"><span data-flap>${flaps(n.toUpperCase())}</span></a></td><td class="what">${w[e ? 1 : 0]}</td><td class="lang"><span data-flap>${flaps(l)}</span></td><td class="st-${k}"><span data-flap>${flaps(e ? d2 : d1)}</span></td><td class="date"><span data-flap>${flaps(d)}</span></td></tr>`).join(''); }
onLang.push(paintBoard);
let flapped = false;
function runFlaps() { if (flapped || calm) return; flapped = true; const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.', cells = [];
  $$('[data-flap]', tb).forEach(s => [...s.children].forEach((c, i) => cells.push({ c, f: c.textContent, n: 6 + i + Math.random() * 10 | 0 })));
  const id = setInterval(() => { let live = 0; for (const k of cells) { if (k.n-- > 0) { live++; k.c.textContent = A[Math.random() * A.length | 0]; } else k.c.textContent = k.f; } if (!live) clearInterval(id); }, 55); }
new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { runFlaps(); o.disconnect(); } }, { threshold: .15 }).observe($('.board'));

/* stone texture for Minecraft buttons, generated here */
{ const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { const v = 100 + Math.random() * 32 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, j, 1, 1); }
  document.documentElement.style.setProperty('--stone-url', `url(${c.toDataURL()})`); const st = document.createElement('style'); st.textContent = `.mc{background-image:var(--stone-url)}.mc:hover,.mc:focus-visible{background-image:none}`; document.head.append(st); }

/* ---------- Lyrics: the real video, buttons jump to its chapters ---------- */
const lyv = $('#lyv'), CHAP = [[0, 6.3], [7.7, 14.4], [15, 26.4]]; let chap = -1, vidOff = false, lyOn = false;
function paintVid() { $('#o-vid').textContent = t('vid')[vidOff ? 1 : 0]; $$('[data-chap]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.chap === chap)); }
onLang.push(paintVid);
$$('[data-chap]').forEach(b => b.addEventListener('click', () => { chap = +b.dataset.chap; lyv.currentTime = CHAP[chap][0]; vidOff = false; lyv.play().catch(() => {}); paintVid(); }));
$('#o-vid').addEventListener('click', () => { vidOff = !vidOff; if (vidOff) lyv.pause(); else lyv.play().catch(() => {}); paintVid(); });
lyv.addEventListener('timeupdate', () => { const end = chap < 0 ? 14.4 : CHAP[chap][1]; if (lyv.currentTime >= end) lyv.currentTime = chap < 0 ? 0 : CHAP[chap][0]; });

/* ---------- Seamless Loading: a real Minecraft frame dissolves chunk by chunk ---------- */
const chunks = $('#chunks'), cx = chunks.getContext('2d'), shot = new Image(); shot.src = 'assets/mc-world.webp';
let lastP = -1, loadtxt = $('#loadtxt');
function paintChunks(p) {
  const W = innerWidth, H = innerHeight; if (chunks.width !== W || chunks.height !== H) { chunks.width = W; chunks.height = H; lastP = -1; }
  if (Math.abs(p - lastP) < .002 || !shot.complete) return; lastP = p; cx.clearRect(0, 0, W, H);
  const s = Math.max(W / shot.width, H / shot.height), dw = shot.width * s, dh = shot.height * s, ox = (W - dw) / 2, oy = (H - dh) / 2, T = W < 700 ? 40 : 64;
  const hsh = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
  const cxn = W / 2, cyn = H / 2, maxd = Math.hypot(cxn, cyn);
  for (let y = 0, j = 0; y < H; y += T, j++) for (let x = 0, i = 0; x < W; x += T, i++) {
    const d = Math.hypot(x + T / 2 - cxn, y + T / 2 - cyn) / maxd, gone = d * .72 + hsh(i, j) * .28; if (gone < p) continue;
    cx.drawImage(shot, (x - ox) / s, (y - oy) / s, T / s, T / s, x, y, T + .5, T + .5);
  }
}

/* ---------- main loop ---------- */
const nextEl = $('#next'), veil = $('#veil'), navA = $$('.route a'), e2 = $('#e2');
const NAMES = { bitdm: 'BitDM', lyric: 'Lyrics in the Sky', fltas: 'FlightAssistant', seaml: 'Seamless Loading', keybd: 'SaveMyKeybinds', earth: 'BeamNG.Earth' };
let last = performance.now(), world = '', covered = false;
function tick(now) {
  const dt = Math.min(.25, (now - last) / 1000); last = now;
  if (dirTo) { dirTo.t += dt / dirTo.d; const u = clamp(dirTo.t, 0, 1), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; scrollTo(0, lerp(dirTo.from, dirTo.to, e)); if (u >= 1) dirTo = null; }
  if (ap) { apY += clamp(vh * .34, 190, 330) * dt; scrollTo(0, apY); if (apY >= touchY + vh * .32) setAP(false, true); }
  const y = scrollY, raw = altAt(y);
  const lp = Math.log(S.alt + 20), lt = Math.log(raw + 20), nl = lerp(lp, lt, 1 - Math.exp(-dt * 7.5)), prev = S.alt;
  S.alt = Math.abs(nl - lt) < .0004 ? raw : Math.max(0, Math.exp(nl) - 20);
  S.vs = lerp(S.vs, (S.alt - prev) / Math.max(dt, .001), 1 - Math.exp(-dt * 6));
  S.spd = lerp(S.spd, 34 + Math.min(120, Math.abs(S.vs) * .05), 1 - Math.exp(-dt * 3));
  if (raw < 300000 && !startedAt) startedAt = now;
  if (S.alt > 60000) wasHigh = true;

  const ground = sstep(0, 40, S.alt), k = 1 - Math.exp(-dt * 3);
  S.roll = lerp(S.roll, (.5 - mx) * .17 * ground + (calm ? 0 : Math.sin(now / 2700) * .012 * ground), k); S.pitch = lerp(S.pitch, (my - .5) * -5 * ground, k); S.yaw = lerp(S.yaw, (.5 - mx) * .05 * ground, k);
  S.fx = lerp(S.fx, (mx - .5) * Math.min(HW * .2, 220), k * 1.6); S.fy = lerp(S.fy, (my - .5) * HH * .2, k * 1.6); S.bankX = lerp(S.bankX, (mx - .5) * 2 * Math.min(S.alt * .05, 16), k);
  S.hdg = 178 + (mx - .5) * 40;

  if (S.alt < .6 && !landed) { const v = Math.abs(S.vs), i = v < 1.5 ? 0 : v < 5 ? 1 : v < 40 ? 2 : 3; landed = { v, i, ms: startedAt ? now - startedAt : 0, jump: !wasHigh }; S.shakeT = calm ? 0 : Math.min(1, .25 + i * .3); showRating(); }
  if (S.alt > 80 && landed) landed = null;
  S.shakeT *= Math.exp(-dt * 5); S.shake = S.shakeT > .01 ? Math.sin(now / 24) * S.shakeT * 1.6 : 0;
  S.touched = y >= touchY ? 1 : 0; S.rollout = lerp(S.rollout, Math.min(2500, Math.max(0, y - touchY) * 1.5), 1 - Math.exp(-dt * 4));

  /* worlds */
  let cur = '', best = 0, opaque = false, faW = 0, sW = 0, sP = 0, lW = 0;
  for (const p of projs) {
    const r = p.el.getBoundingClientRect(), w = sstep(vh * 1.02, vh * .42, r.top) * (1 - sstep(vh * .62, vh * .08, r.bottom)); p.w = w; p.p = clamp((vh * .5 - r.top) / Math.max(r.height - vh * .4, 1), 0, 1);
    if (p.layer) { p.layer.style.opacity = w; p.layer.style.visibility = w > .002 ? 'visible' : 'hidden'; }
    if (w > best) { best = w; cur = p.id; }
    if (w > .995 && (p.id === 'bitdm' || p.id === 'lyric' || p.id === 'earth')) opaque = true;
    if (p.id === 'fltas') faW = w; if (p.id === 'seaml') { sW = w; sP = p.p; } if (p.id === 'lyric') lW = w;
    if (p.id === 'earth') e2.style.opacity = sstep(.42, .62, p.p);
  }
  const wName = best > .4 ? cur : (y < vh * .5 ? 'hero' : 'transit');
  if (wName !== world) { world = wName; document.body.dataset.world = world; nextEl.textContent = NAMES[world] || ''; navA.forEach(a => a.classList.toggle('now', a.dataset.go === world)); }
  covered = opaque;
  S.night = faW;

  /* seamless */
  if (sW > .002) { const pr = sstep(.2, .86, sP); paintChunks(pr); const pc2 = Math.round(pr * 100); loadtxt.hidden = sW < .5 || pc2 >= 100; loadtxt.textContent = `${t('loading')} ${pc2} %`; } else loadtxt.hidden = true;

  /* lyrics */
  const inLy = lW > .4; if (inLy !== lyOn) { lyOn = inLy; if (inLy && !vidOff) lyv.play().catch(() => {}); else lyv.pause(); }

  /* alerts: only while actually flying */
  let al = null; const tti = S.vs < -1 ? S.alt / -S.vs : 99, flying = best < .4 || faW > .4;
  if (now < alertUntil) al = 'PULL UP'; else if (flying && !ap && !dirTo && S.alt > 25 && S.alt < 6000) { if (tti < .9) al = 'PULL UP'; else if (tti < 2) al = 'SINK RATE'; }
  setAlert(al);

  const cl = (Math.log(S.alt + 20) - Math.log(1960)) / .17; veil.style.opacity = gl ? (Math.exp(-cl * cl) * .93 * (1 - best)).toFixed(3) : 0;

  hc.clearRect(0, 0, HW, HH);
  if (faW > .01) drawFA(S, faW); else if (world === 'transit' && S.alt > 2) drawMini(S);
  if (gl && !covered) gl.frame(S, dt, now / 1000);
  requestAnimationFrame(tick);
}

function boot() {
  sizeHud(); layout(); setLang(lang); S.alt = altAt(scrollY); gl && gl.paintRunway();
  requestAnimationFrame(tick);
}
addEventListener('resize', () => { sizeHud(); layout(); });
addEventListener('load', layout);
(document.fonts && document.fonts.ready ? Promise.race([Promise.all([document.fonts.load('900 64px "Big Shoulders Display"'), document.fonts.load('400 18px "Pixelify Sans"'), document.fonts.ready]), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve()).then(boot, boot);
})();
