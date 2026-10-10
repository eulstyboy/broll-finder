/* Bille Foraine — moteur du jeu (v0.3).
   L'écran est la vitre d'une boîte vue d'en haut. Tout est projeté depuis un œil placé au-dessus de la vitre ;
   l'œil se déplace avec l'inclinaison, ce qui donne le relief. Dans les mondes ouverts, la caméra suit la bille. */
(() => {
'use strict';
const LEV = window.BFLevels;
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now();
const wait = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEBUG = /debug/.test(location.hash);
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const MAX_BALLS = 10;
const BRAVE = !!(navigator.brave && navigator.brave.isBrave);

/* ---------------- Réglages ---------------- */
const DEF = { sens: 1, relief: 1, persp: 1, fric: 1, jump: 13, shake: 1, pix: 'normal', sound: true };
const S = { ...DEF };
try { Object.assign(S, JSON.parse(localStorage.getItem('bf.settings') || '{}')); } catch (e) {}
if (REDUCED && !S.shakeSet) S.shake = 0;
const saveS = () => { try { localStorage.setItem('bf.settings', JSON.stringify(S)); } catch (e) {} };

/* ---------------- Pixel art ---------------- */
const PAL = { Y: '#f2b544', O: '#a8721f', W: '#f3e9d2', R: '#e2483d', D: '#9b2a25', G: '#3aa572', g: '#23704b', K: '#0f1719',
  L: '#fff3c4', P: '#f08fa0', p: '#a04a5c', B: '#5fa8e8', b: '#1d5a96', V: '#8b6be0', C: '#5fc6d0', S: '#7d8b93', s: '#3a454b', N: '#f08a3a' };
function bmpCanvas(rows, scale) {
  const c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale;
  const x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i * scale, j * scale, scale, scale); } }));
  return c;
}
const PAUSE_BMP = ['WW..WW', 'WW..WW', 'WW..WW', 'WW..WW', 'WW..WW', 'WW..WW'];
const COIN_BMP = ['...OOOO...', '..OYYYYO..', '.OYLYYYYO.', 'OYLYYOYYYO', 'OYLYOYYYYO', 'OYYYYOYYYO', 'OYYYYYOYYO', '.OYYYYYYO.', '..OYYYYO..', '...OOOO...'];
const COIN_URL = bmpCanvas(COIN_BMP, 4).toDataURL();

/* ---------------- Billes ----------------
   Chaque bille a un pouvoir (sauf la bille simple). Le pouvoir n'agit que quand cette bille est en jeu. */
const BALLS = {
  plain:  { name: 'Bille simple', price: 2, desc: 'Pas de pouvoir. Une bille de plus dans ta réserve.',
    col: ['#fffaf0', '#ece0c4', '#9c8564'], spot: '#d23b33', bmp: null },
  jump:   { name: 'Ressort', price: 5, desc: 'Un coup sec du téléphone (ou le bouton Saut) fait sauter la bille.',
    col: ['#e3f2ff', '#5fa8e8', '#1d5a96'], spot: '#f3e9d2',
    bmp: ['....Y....','...YYY...','..YYYYY..','....Y....','.WWWWWWW.','..W...W..','.WWWWWWW.','..W...W..','.WWWWWWW.'] },
  dbl:    { name: 'Double ressort', price: 7, desc: 'Saute, puis saute encore une fois en l’air.',
    col: ['#eee6ff', '#8b6be0', '#4a2f96'], spot: '#f2b544',
    bmp: ['....Y....','...YYY...','..Y.Y.Y..','.........','....Y....','...YYY...','..Y.Y.Y..','.WWWWWWW.','.........'] },
  magnet: { name: 'Aimant', price: 4, desc: 'Les pièces proches volent vers la bille.',
    col: ['#ffe0dc', '#e2483d', '#7a1c18'], spot: '#f3e9d2',
    bmp: ['.WW...WW.','.WW...WW.','.RR...RR.','.RR...RR.','.RR...RR.','.RRR.RRR.','..RRRRR..','...RRR...','.........'] },
  net:    { name: 'Filet', price: 4, desc: 'La première fois qu’elle tombe dans une manche, elle revient au départ.',
    col: ['#eef6e4', '#9cc47a', '#4f7a33'], spot: '#f3e9d2',
    bmp: ['Y.......Y','.W.W.W.W.','..W.W.W..','.W.W.W.W.','..W.W.W..','...W.W...','....W....','.........','.........'] },
  gold:   { name: 'Bille dorée', price: 6, desc: 'Chaque pièce ramassée rapporte $1 de plus.',
    col: ['#fff3c4', '#f2b544', '#8a5a17'], spot: '#9b2a25',
    bmp: ['...YYY...','..YWYYY..','.YWYYYYY.','.YYYYYYY.','.YYYYYYO.','.YYYYYOO.','..YYYOO..','...OOO...','.........'] },
  felt:   { name: 'Bille feutrée', price: 3, desc: 'Elle freine vite : plus facile à doser.',
    col: ['#d8f0e0', '#3aa572', '#1d5a3a'], spot: '#f3e9d2',
    bmp: ['.........','GGGGGGGGG','GgGgGgGgG','GGGGGGGGG','gGgGgGgGg','GGGGGGGGG','GgGgGgGgG','GGGGGGGGG','.........'] },
  anchor: { name: 'Ancre', price: 4, desc: 'Garde le doigt sur le bouton Frein : la bille s’arrête net.',
    col: ['#eef1f3', '#7d8b93', '#3a454b'], spot: '#f2b544',
    bmp: ['....W....','...W.W...','....W....','..WWWWW..','....W....','W...W...W','WW..W..WW','.WWWWWWW.','...WWW...'] },
  chain:  { name: 'Série', price: 5, desc: 'Pièces ramassées à la suite : +$1, +$2, puis +$3 chacune.',
    col: ['#fff0d0', '#f08a3a', '#8a4510'], spot: '#f3e9d2',
    bmp: ['....YY...','...YY....','..YY.....','.YYYYYY..','....YY...','...YY....','..YY.....','.Y.......','.........'] },
  slow:   { name: 'Ralentie', price: 5, desc: 'Le temps ralentit quand elle frôle un piège.',
    col: ['#e6fafc', '#5fc6d0', '#24707a'], spot: '#f3e9d2',
    bmp: ['.WWWWWWW.','.WYYYYYW.','..WYYYW..','...WYW...','....W....','...WYW...','..WYYYW..','.WYYYYYW.','.WWWWWWW.'] },
  piggy:  { name: 'Tirelire', price: 4, desc: '+$3 à l’encaissement si elle met la bille dans le trou doré.',
    col: ['#ffe6eb', '#f08fa0', '#a04a5c'], spot: '#a04a5c',
    bmp: ['...YYY...','..P.Y.P..','.PPPPPPP.','PPPKPPPPP','PPPPPPPpP','.PPPPPPP.','.pp...pp.','.pp...pp.','.........'] },
};
const POWER_KINDS = Object.keys(BALLS).filter(k => k !== 'plain');
const iconCanvas = (k, s) => bmpCanvas(BALLS[k].bmp || ['.........'], s);
/* Petite bille en pixel art pour la réserve, la boutique et les bulles d'aide. */
function ballCanvas(kind, px = 12) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d'), k = BALLS[kind], r = px / 2;
  const gr = x.createRadialGradient(r * .7, r * .6, r * .1, r, r, r);
  gr.addColorStop(0, k.col[0]); gr.addColorStop(.55, k.col[1]); gr.addColorStop(1, k.col[2]);
  x.fillStyle = gr; x.beginPath(); x.arc(r, r, r - .3, 0, TAU); x.fill();
  x.fillStyle = k.spot; x.fillRect(Math.round(r * 1.15), Math.round(r * 1.05), Math.max(1, px / 6), Math.max(1, px / 6));
  x.fillRect(Math.round(r * .55), Math.round(r * 1.35), Math.max(1, px / 8), Math.max(1, px / 8));
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(Math.round(r * .55), Math.round(r * .45), Math.max(1, px / 7), Math.max(1, px / 7));
  return c;
}

/* ---------------- État ---------------- */
const G = { mode: 'title', paused: false, round: 1, money: 0, shown: 0, rack: [], cur: 0, choosing: false,
  level: LEV.HAND[0], seed: 1, taken: new Set(), fell: false, netUsed: false, roundCoins: 0, offers: [], sold: new Set(),
  rerollCost: 2, best: 0, combo: 0, comboT: 0, bossReward: false, endless: false, earned: 0, won: 0, runId: '', swapFor: null };
try { G.best = +localStorage.getItem('bf.best') || 0; } catch (e) {}

const B = { x: 0, y: 0, hz: 0, vx: 0, vy: 0, vz: 0, onGround: true, state: 'roll', sink: null, jumpCD: 0, tpCD: 0, air2: false,
  kind: 'plain', rot: [1,0,0, 0,1,0, 0,0,1], rotN: 0, sq: null, trail: [] };
const has = k => B.kind === k || (k === 'jump' && B.kind === 'dbl');

/* ---------------- Canvas & géométrie ---------------- */
const cv = $('#game'), ctx = cv.getContext('2d');
let W = 0, H = 0, gpx = 1, geo = null, floorCv = null;
let E = 1, D = 1, OX = 0, OY = 0, shakeAmp = 0, ts = 1;
const eye = { x: 0, y: 0 }, eyeW = { x: 0, y: 0 }, cam = { x: 0, y: 0, rate: 30 };
const edgeFlash = { l: 0, r: 0, t: 0, b: 0 };
let motes = [];

function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cw = window.innerWidth, ch = window.innerHeight;
  const target = { fin: 380, normal: 300, gros: 210 }[S.pix] || 300;
  const scale = Math.max(1, Math.round(cw * dpr / target));
  const nW = Math.max(60, Math.floor(cw * dpr / scale)), nH = Math.max(100, Math.floor(ch * dpr / scale));
  cv.style.width = (nW * scale / dpr) + 'px';
  cv.style.height = (nH * scale / dpr) + 'px';
  gpx = scale / dpr;
  if (nW !== W || nH !== H) {
    const nx = geo ? B.x / geo.WW : null, ny = geo ? B.y / geo.HH : null;
    W = nW; H = nH; cv.width = W; cv.height = H;
    buildGeometry();
    if (nx !== null) { B.x = nx * geo.WW; B.y = ny * geo.HH; }
    updateCam(0, true);
  }
}

function buildGeometry() {
  const lv = G.level, rows = lv.map, R = rows.length, C = rows[0].length, scroll = !!lv.scroll;
  let cw, chh, c;
  if (scroll) { c = W / 9; cw = chh = c; } else { cw = W / C; chh = H / R; c = Math.min(cw, chh); }
  const WW = scroll ? C * c : W, HH = scroll ? R * c : H;
  const g = { c, cw, ch: chh, C, R, WW, HH, scroll, r: c * .3, wallH: c * .8, lowH: c * .36, maxH: 0,
    rects: [], holes: [], coins: [], bumpers: [], portals: [], floor: new Array(C * R).fill('.'), start: { x: WW / 2, y: HH * .85 }, time: 0 };
  for (const [ch, h] of [['#', g.wallH], ['=', g.lowH]]) {
    const runs = [];
    for (let y = 0; y < R; y++) {
      let x = 0;
      while (x < C) {
        if (rows[y][x] === ch) { let x1 = x; while (x1 + 1 < C && rows[y][x1 + 1] === ch) x1++; runs.push({ c0: x, c1: x1, y0: y, y1: y }); x = x1 + 1; }
        else x++;
      }
    }
    const merged = [];
    for (const r of runs) {
      const m = merged.find(q => q.c0 === r.c0 && q.c1 === r.c1 && q.y1 === r.y0 - 1);
      if (m) m.y1 = r.y0; else merged.push({ ...r });
    }
    for (const q of merged) g.rects.push({ x0: q.c0 * cw, x1: (q.c1 + 1) * cw, y0: q.y0 * chh, y1: (q.y1 + 1) * chh, h, low: ch === '=', flash: 0 });
  }
  g.maxH = g.rects.reduce((m, r) => Math.max(m, r.h), 0);
  let ci = 0;
  const portals = {};
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const ch = rows[y][x], px = (x + .5) * cw, py = (y + .5) * chh;
    if (ch === 'o' || ch === 'G') g.holes.push({ x: px, y: py, x0: px, y0: py, R: c * .4, depth: c * 1.3, goal: ch === 'G', mv: null });
    else if (ch === '$' || ch === '*') {
      const big = ch === '*';
      g.coins.push({ i: ci, x: px, y: py, h: big ? c * .8 : c * .62, big, base: big ? 5 : 1, phase: Math.random() * TAU, fly: false, taken: G.taken.has(ci), pop: -1 });
      ci++;
    }
    else if (ch === 'b') g.bumpers.push({ x: px, y: py, R: c * .4, h: c * .62, pulse: 0 });
    else if (ch >= '1' && ch <= '4') (portals[ch] = portals[ch] || []).push({ x: px, y: py, R: c * .4, id: ch, glow: 0 });
    else if (ch === 'S') g.start = { x: px, y: py };
  }
  for (const k in portals) if (portals[k].length === 2) { const [a, b] = portals[k]; a.to = b; b.to = a; g.portals.push(a, b); }
  for (const m of lv.movers || []) {
    const px = (m.x + .5) * cw, py = (m.y + .5) * chh;
    g.holes.push({ x: px, y: py, x0: px, y0: py, R: c * .4, depth: c * 1.3, goal: false,
      mv: { ax: m.axis === 'x' ? m.amp * cw : 0, ay: m.axis === 'y' ? m.amp * chh : 0, w: m.w, ph: m.ph } });
  }
  if (lv.floor) for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) g.floor[y * C + x] = lv.floor[y][x];
  geo = g;
  E = W * 1.35 / S.persp; D = g.wallH + c * .22;
  motes = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: rnd(.08, .92) * D, vx: rnd(-.25, .25) * c, vy: rnd(-.2, .2) * c, ph: Math.random() * TAU }));
  renderFloor();
}
const floorAt = (x, y) => {
  const g = geo, cx = Math.floor(x / g.cw), cy = Math.floor(y / g.ch);
  return cx < 0 || cy < 0 || cx >= g.C || cy >= g.R ? '.' : g.floor[cy * g.C + cx];
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FLOOR_PAL = {
  '.': [[22, 60, 47], [30, 80, 62], [39, 101, 78], [50, 120, 92]],
  i: [[104, 160, 192], [134, 190, 218], [170, 216, 236], [214, 240, 250]],
  g: [[84, 50, 20], [112, 70, 28], [140, 92, 38], [166, 114, 50]],
};
function renderFloor() {
  const g = geo, FW = Math.ceil(g.WW), FH = Math.ceil(g.HH);
  floorCv = document.createElement('canvas'); floorCv.width = FW; floorCv.height = FH;
  const f = floorCv.getContext('2d');
  const img = f.createImageData(FW, FH), d = img.data;
  const s = Math.max(5, Math.round(g.c * 0.5));
  for (let y = 0; y < FH; y++) {
    const cy = Math.min(g.R - 1, Math.floor(y / g.ch)), fy = y - cy * g.ch;
    for (let x = 0; x < FW; x++) {
      const cx = Math.min(g.C - 1, Math.floor(x / g.cw)), fx = x - cx * g.cw;
      const type = g.floor[cy * g.C + cx];
      let v;
      if (g.scroll) v = .8 + .07 * Math.sin(x * .045) * Math.sin(y * .038);
      else { const nx = x / FW - .5, ny = y / FH - .5; v = .95 - (nx * nx + ny * ny) * 1.7; }
      const hsh = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
      v += ((hsh % 1000) / 1000 - .5) * .2;
      if (type === 'i') { if (((x * 2 - y) % (s * 3) + s * 3) % (s * 3) < 1) v += .3; if (hsh % 97 === 0) v += .5; }
      else if (type === 'g') { if (hsh % 13 === 0) v -= .35; if (((x + y * 3) % (s * 2)) === 0) v += .15; }
      else { const a = (x + y) % s, b = ((x - y) % s + s) % s; if (a === 0 || b === 0) v -= .2; }
      // contour quand le sol change de nature
      if ((fx < 1 && cx > 0 && g.floor[cy * g.C + cx - 1] !== type) || (fx >= g.cw - 1 && cx < g.C - 1 && g.floor[cy * g.C + cx + 1] !== type) ||
          (fy < 1 && cy > 0 && g.floor[(cy - 1) * g.C + cx] !== type) || (fy >= g.ch - 1 && cy < g.R - 1 && g.floor[(cy + 1) * g.C + cx] !== type)) v -= .45;
      const pal = FLOOR_PAL[type] || FLOOR_PAL['.'];
      const col = pal[clamp(Math.floor(v * 3 + BAYER[(y & 3) * 4 + (x & 3)] / 16), 0, 3)], i = (y * FW + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  f.putImageData(img, 0, 0);
  f.fillStyle = 'rgba(0,0,0,.2)';
  for (const rc of g.rects) { const m = g.c * .12; f.fillRect(rc.x0 - m, rc.y0 - m, rc.x1 - rc.x0 + 2 * m, rc.y1 - rc.y0 + 2 * m); }
  f.strokeStyle = 'rgba(243,233,210,.35)'; f.lineWidth = 1; f.setLineDash([2, 2]);
  f.beginPath(); f.arc(g.start.x, g.start.y, g.c * .46, 0, TAU); f.stroke();
  // trajet des pièges mobiles, en pointillés
  f.strokeStyle = 'rgba(0,0,0,.4)';
  for (const h of g.holes) if (h.mv) { f.beginPath(); f.moveTo(h.x0 - h.mv.ax, h.y0 - h.mv.ay); f.lineTo(h.x0 + h.mv.ax, h.y0 + h.mv.ay); f.stroke(); }
  f.setLineDash([]);
  for (const h of g.holes) if (h.goal) {
    f.fillStyle = 'rgba(242,181,68,.6)';
    for (let k = 0; k < 14; k++) { const an = k / 14 * TAU; f.fillRect(Math.round(h.x + Math.cos(an) * h.R * 1.6) - 1, Math.round(h.y + Math.sin(an) * h.R * 1.6) - 1, 2, 2); }
  }
}

/* ---------------- Projection : œil au-dessus de la vitre, caméra qui suit la bille ---------------- */
const tz = z => E / (E + z);
function P(x, y, z) { const t = E / (E + z); return [eye.x + (x - cam.x - eye.x) * t, eye.y + (y - cam.y - eye.y) * t]; }
function atDepth(z) { const t = E / (E + z); ctx.setTransform(t, 0, 0, t, eye.x * (1 - t) - cam.x * t + OX, eye.y * (1 - t) - cam.y * t + OY); return t; }
const reset = () => ctx.setTransform(1, 0, 0, 1, OX, OY);
function updateCam(dt, snap) {
  if (!geo || !geo.scroll) { cam.x = cam.y = 0; return; }
  const tx = B.x - W / 2, ty = B.y - H / 2;
  if (snap) { cam.x = tx; cam.y = ty; cam.rate = 30; return; }
  cam.rate += (30 - cam.rate) * (1 - Math.exp(-dt * 2.5));
  const k = 1 - Math.exp(-dt * cam.rate);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

/* ---------------- Capteurs ----------------
   Source principale : l'orientation (gyroscope). Secours : la gravité mesurée par l'accéléromètre. */
const SENS = { src: 'none', ori: null, oriT: 0, rel: false, grav: null, g0: null, motT: 0, since: now(), denied: false, started: false, warned: false };
let ctrl = 'none', neutral = null, needCalib = true, anchorHeld = false;
const tiltRaw = { x: 0, y: 0 }, tilt = { x: 0, y: 0 }, eyeT = { x: 0, y: 0 };
let touch = null, touchTilt = { x: 0, y: 0 }, mouse = null, lastTap = 0, lastJerk = 0, gLP = null;
const keys = new Set();
const CTRL_NAMES = { sensor: 'Capteurs', touch: 'Doigt', mouse: 'Souris', none: 'En attente' };
function setCtrl(m) { if (ctrl === m) return; ctrl = m; $('#ctrlLabel').textContent = CTRL_NAMES[m]; updateSensorStatus(); }
function onOri(e, abs) {
  if (e.beta == null || e.gamma == null) return;
  if (abs && SENS.rel) return;
  if (!abs) SENS.rel = true;
  SENS.ori = { b: e.beta, g: e.gamma }; SENS.oriT = now();
  if (SENS.src !== 'orientation') { SENS.src = 'orientation'; needCalib = true; setCtrl('sensor'); updateSensorStatus(); }
  if (needCalib || !neutral) { neutral = { ...SENS.ori }; needCalib = false; }
}
function onMotion(e) {
  const ag = e.accelerationIncludingGravity;
  if (ag && ag.x != null && ag.y != null) {
    const sg = IOS ? -1 : 1, v = { x: ag.x * sg, y: ag.y * sg };
    SENS.grav = SENS.grav ? { x: lerp(SENS.grav.x, v.x, .35), y: lerp(SENS.grav.y, v.y, .35) } : v;
    SENS.motT = now();
    if (SENS.src === 'gravity' && (needCalib || !SENS.g0)) { SENS.g0 = { ...SENS.grav }; needCalib = false; }
  }
  // saut : un coup sec perpendiculaire à l'écran
  let az = null;
  const a = e.acceleration;
  if (a && a.z != null) az = a.z;
  else if (ag && ag.z != null) { gLP = gLP == null ? ag.z : gLP * .9 + ag.z * .1; az = ag.z - gLP; }
  if (az != null && Math.abs(az) > S.jump && now() - lastJerk > 450) { lastJerk = now(); tryJump(); }
}
addEventListener('deviceorientation', e => onOri(e, false));
addEventListener('deviceorientationabsolute', e => onOri(e, true));
addEventListener('devicemotion', onMotion);
function checkSensors() {
  const t = now();
  // pas d'orientation mais de la gravité : on bascule sur l'accéléromètre
  if (SENS.src === 'none' && SENS.grav && t - SENS.motT < 600 && t - SENS.since > 1200) {
    SENS.src = 'gravity'; needCalib = true; SENS.g0 = null; setCtrl('sensor'); updateSensorStatus();
  }
  if (SENS.started && !SENS.warned && SENS.src === 'none' && t - SENS.since > 1800) {
    SENS.warned = true; updateSensorStatus();
    if (TOUCH) toast(SENS.denied ? 'Mouvements refusés. Autorise-les dans les réglages du navigateur, puis recharge la page.'
      : BRAVE ? 'Brave bloque les mouvements du téléphone. Baisse les boucliers (icône du lion) pour eulst.app, ou ouvre la page dans Chrome.'
      : 'Ton navigateur ne transmet pas les mouvements du téléphone. Joue au doigt, ou ouvre la page dans Chrome ou Safari.', 6000);
  }
}
function enableSensors() {
  const reqs = [];
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') reqs.push(DeviceOrientationEvent.requestPermission());
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') reqs.push(DeviceMotionEvent.requestPermission());
  } catch (e) {}
  return Promise.allSettled(reqs).then(rs => {
    if (rs.some(r => r.status === 'fulfilled' && r.value === 'denied') || rs.some(r => r.status === 'rejected')) SENS.denied = true;
  });
}
function updateSensorStatus() {
  const el = $('#sensorStatus'); if (!el) return;
  let cls = '', txt;
  if (SENS.src === 'orientation') { cls = 'ok'; txt = 'Capteurs actifs : le gyroscope pilote la bille'; }
  else if (SENS.src === 'gravity') { cls = 'ok'; txt = 'Capteurs actifs : l’accéléromètre pilote la bille'; }
  else if (!TOUCH) txt = 'Sur ordinateur : la souris ou les flèches inclinent la boîte';
  else if (SENS.denied) { cls = 'bad'; txt = 'Mouvements refusés : autorise-les dans les réglages du navigateur'; }
  else if (SENS.warned) { cls = 'bad'; txt = BRAVE ? 'Brave bloque les mouvements : baisse les boucliers (lion) pour ce site' : 'Aucun mouvement reçu : tu joues au doigt'; }
  else txt = 'Capteurs : touche Jouer pour les activer';
  el.className = 'status ' + cls; el.querySelector('span').textContent = txt;
}

cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') { if (G.choosing) launch(G.cur); return; }
  if (G.choosing) { launch(G.cur); return; }
  touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
  if (ctrl !== 'sensor') setCtrl('touch');
  const t = now(); if (t - lastTap < 320) tryJump(); lastTap = t;
});
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    mouse = { x: clamp((e.clientX / innerWidth - .5) * 2, -1, 1), y: clamp((e.clientY / innerHeight - .5) * 2, -1, 1) };
    if (ctrl === 'none') setCtrl('mouse');
  } else if (touch && e.pointerId === touch.id) {
    const span = Math.min(innerWidth, innerHeight) * .22;
    touchTilt = { x: clamp((e.clientX - touch.x0) / span, -1, 1), y: clamp((e.clientY - touch.y0) / span, -1, 1) };
  }
});
const endTouch = e => { if (touch && e.pointerId === touch.id) { touch = null; touchTilt = { x: 0, y: 0 }; } };
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch);
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { keys.add(e.key); e.preventDefault(); }
  if (e.key === ' ' && G.mode === 'play') { if (G.choosing) launch(G.cur); else tryJump(); e.preventDefault(); }
  if (e.key === 'Shift') anchorHeld = true;
  if (e.key === 'Escape' && G.mode === 'play' && !G.paused) openSettings();
  if (e.key === 'm') toggleSound();
});
addEventListener('keyup', e => { keys.delete(e.key); if (e.key === 'Shift') anchorHeld = false; });

const BOT = { on: false, path: null, t: 0, cell: '' };
function readTilt(t, dt) {
  let x = 0, y = 0;
  if (BOT.on && G.mode === 'play' && B.state === 'roll') { const v = botTilt(dt); x = v.x; y = v.y; }
  else if (ctrl === 'sensor' && SENS.src === 'orientation' && SENS.ori && neutral) {
    const db = clamp(SENS.ori.b - neutral.b, -70, 70), dg = clamp(SENS.ori.g - neutral.g, -70, 70);
    x = Math.sin(dg * DEG); y = Math.sin(db * DEG);
  } else if (ctrl === 'sensor' && SENS.src === 'gravity' && SENS.grav && SENS.g0) {
    x = clamp(-(SENS.grav.x - SENS.g0.x) / 9.81, -1, 1); y = clamp((SENS.grav.y - SENS.g0.y) / 9.81, -1, 1);
  } else if (keys.size) {
    x = (keys.has('ArrowRight') ? .35 : 0) - (keys.has('ArrowLeft') ? .35 : 0);
    y = (keys.has('ArrowDown') ? .35 : 0) - (keys.has('ArrowUp') ? .35 : 0);
  } else if (ctrl === 'mouse' && mouse) { x = mouse.x * .45; y = mouse.y * .45; }
  else if (G.mode !== 'play') { x = Math.sin(t * .63) * .32; y = Math.cos(t * .81) * .26; }
  else if (ctrl === 'touch') { x = touchTilt.x * .5; y = touchTilt.y * .5; }
  tiltRaw.x = x; tiltRaw.y = y;
}
const calibrate = () => { needCalib = true; };

/* ---------------- Son ---------------- */
let AC = null, master = null, rollG = null, rollF = null, white = null;
function initAudio() {
  if (AC) { AC.resume && AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  master = AC.createGain(); master.gain.value = S.sound ? .8 : 0; master.connect(AC.destination);
  white = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = white; src.loop = true;
  rollF = AC.createBiquadFilter(); rollF.type = 'bandpass'; rollF.frequency.value = 260; rollF.Q.value = .8;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  rollG = AC.createGain(); rollG.gain.value = 0;
  src.connect(rollF).connect(lp).connect(rollG).connect(master); src.start();
}
function tone(f0, dur, type = 'square', vol = .12, delay = 0, f1 = null) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
}
function knock(v) {
  if (!AC) return;
  const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = white; f.type = 'lowpass'; f.frequency.value = 700 + v * 2200;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05 + .55 * v, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + .08);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 1.5, .1);
  tone(150 + v * 60, .09, 'sine', .25 * v);
}
const sfx = {
  coin: n => { const k = Math.pow(2, Math.min(n, 12) / 12); tone(988 * k, .06, 'square', .08); tone(1319 * k, .18, 'square', .08, .06); },
  jump: () => tone(210, .2, 'triangle', .22, 0, 560),
  fall: () => { tone(560, .55, 'triangle', .2, 0, 60); setTimeout(() => knock(.5), 380); },
  lose: () => tone(196, .35, 'sawtooth', .08, 0, 92),
  win:  () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .16, 'square', .08, i * .08)),
  buy:  () => { tone(660, .06, 'square', .08); tone(990, .12, 'square', .08, .06); },
  tick: (p = 440) => tone(p, .03, 'square', .05),
  deal: () => knock(.15),
  no:   () => tone(140, .12, 'square', .07),
  net:  () => [880, 660, 990].forEach((f, i) => tone(f, .1, 'triangle', .14, i * .07)),
  bump: () => { tone(520, .09, 'square', .1, 0, 820); knock(.35); },
  warp: () => { tone(330, .14, 'triangle', .15, 0, 990); tone(660, .2, 'sine', .1, .06, 1320); },
  boss: () => { tone(110, .5, 'square', .12, 0, 55); tone(82, .7, 'sawtooth', .08, .1, 41); knock(.8); },
  pick: () => { tone(784, .05, 'square', .07); tone(1175, .1, 'square', .07, .05); },
};
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

/* ---------------- Effets ---------------- */
const parts = [], texts = [], rings = [], bursts = [];
function addShake(a) { shakeAmp = Math.max(shakeAmp, a * S.shake); }
function flash(color, peak = .35, ms = 380) {
  if (REDUCED) return;
  const f = $('#flash'); f.style.background = color;
  f.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
}
function spray(x, y, z, n, colors, spd, up, dir = null, spread = Math.PI, size = 1) {
  const c = geo.c;
  for (let k = 0; k < n; k++) {
    const a = dir == null ? Math.random() * TAU : dir + rnd(-spread, spread);
    const v = rnd(.3, 1) * spd * c;
    parts.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: -rnd(.3, 1) * up * c, life: rnd(.35, .7), max: .7,
      col: colors[k % colors.length], size: Math.random() < .35 ? size + 1 : size });
  }
}
function impact(v, n, rc, edge) {
  const g = geo, c = g.c, s = Math.min(1, v / (12 * c));
  knock(s); buzz(Math.round(6 + s * 24));
  if (s < .16) return;
  const x = B.x - n[0] * g.r, y = B.y - n[1] * g.r, z = D - g.r - B.hz;
  bursts.push({ x, y, z, a: Math.atan2(n[1], n[0]), t: 0, life: .26, s });
  const cols = rc ? (rc.low ? ['#d99a55', '#f3e9d2', '#b5793b'] : ['#ec7a5c', '#e8b04a', '#f3e9d2', '#cf463c']) : ['#c98b32', '#f3e9d2', '#6b4450'];
  spray(x, y, z, Math.round(4 + s * 14), cols, 3 + s * 7, 1 + s * 4, Math.atan2(n[1], n[0]), 1.1);
  spray(x, y, D - .5, Math.round(2 + s * 6), ['#4a9a78', '#2c6e55'], 2 + s * 3, .6, Math.atan2(n[1], n[0]), 1.3);
  if (rc) rc.flash = Math.max(rc.flash, s);
  if (edge) edgeFlash[edge] = Math.max(edgeFlash[edge], s);
  B.sq = { amp: Math.min(.34, s * .42), ang: Math.atan2(n[1], n[0]), t: 0, radial: false };
  if (s > .3 && G.mode === 'play') addShake(s * s * c * .22);
}
function landing(v, ground) {
  const g = geo, c = g.c, s = Math.min(1, v / (14 * c));
  knock(s * .8); buzz(Math.round(5 + s * 18));
  const z = D - ground;
  rings.push({ x: B.x, y: B.y, z, t: 0, life: .35, r0: g.r * .8, r1: g.r * (1.6 + s * 1.6) });
  spray(B.x, B.y, z - .5, Math.round(4 + s * 8), ['#4a9a78', '#f3e9d2'], 2 + s * 4, .8);
  B.sq = { amp: Math.min(.3, s * .35), ang: 0, t: 0, radial: true };
  if (s > .35 && G.mode === 'play') addShake(s * c * .15);
}

/* ---------------- Physique ---------------- */
function groundAt(x, y) {
  let h = 0;
  for (const rc of geo.rects) if (x >= rc.x0 && x <= rc.x1 && y >= rc.y0 && y <= rc.y1 && rc.h > h) h = rc.h;
  return h;
}
function rotAxis(ax, ay, az, a) {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t*ax*ax + c, t*ax*ay - s*az, t*ax*az + s*ay,
          t*ax*ay + s*az, t*ay*ay + c, t*ay*az - s*ax,
          t*ax*az - s*ay, t*ay*az + s*ax, t*az*az + c];
}
function mul3(a, b) { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i*3+j] = a[i*3]*b[j] + a[i*3+1]*b[3+j] + a[i*3+2]*b[6+j]; return r; }
function ortho(m) {
  let a = [m[0], m[3], m[6]], b = [m[1], m[4], m[7]];
  const na = Math.hypot(...a); a = a.map(v => v / na);
  const dp = a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; b = b.map((v, i) => v - dp * a[i]);
  const nb = Math.hypot(...b); b = b.map(v => v / nb);
  const c = [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]];
}
function placeBall(drop) {
  B.x = geo.start.x; B.y = geo.start.y; B.vx = B.vy = 0; B.trail = []; B.air2 = false; B.tpCD = 0;
  B.hz = drop ? geo.c * 2.4 : 0; B.vz = 0; B.onGround = !drop; B.state = 'roll'; B.sink = null;
  if (geo.scroll) cam.rate = 5;
}

function step(dt) {
  const g = geo, c = g.c, r = g.r, attract = G.mode === 'title';
  g.time += dt;
  for (const h of g.holes) if (h.mv) { const s = Math.sin(g.time * h.mv.w + h.mv.ph); h.x = h.x0 + h.mv.ax * s; h.y = h.y0 + h.mv.ay * s; }
  if (B.jumpCD > 0) B.jumpCD -= dt;
  if (B.tpCD > 0) B.tpCD -= dt;
  if (B.state === 'sink') { stepSink(dt); return; }
  if (B.state !== 'roll') return;

  const GV = 34 * c, acc = 28 * c * S.sens;
  const ft = B.onGround && B.hz < 1e-3 ? floorAt(B.x, B.y) : '.';
  let fric = (has('felt') ? 1.7 : .55) * S.fric;
  if (ft === 'i') fric *= .12; else if (ft === 'g') fric *= 4.5;
  const braking = anchorHeld && has('anchor');
  if (braking) fric = Math.max(fric, 6);
  if (B.onGround) {
    const k2 = braking ? .25 : 1;
    B.vx += tilt.x * acc * dt * k2; B.vy += tilt.y * acc * dt * k2;
    const k = Math.exp(-fric * dt); B.vx *= k; B.vy *= k;
  } else { B.vx += tilt.x * acc * dt * .12; B.vy += tilt.y * acc * dt * .12; }

  if (B.onGround && B.hz < 1e-3 && !attract) {
    for (const h of g.holes) {
      const dx = h.x - B.x, dy = h.y - B.y, d = Math.hypot(dx, dy);
      if (d < h.R) {
        const pull = (1 - d / h.R) * 60 * c;
        if (d > 1e-4) { B.vx += dx / d * pull * dt; B.vy += dy / d * pull * dt; }
        if (d < h.R - r * .75) { startSink(h); return; }
      }
    }
  }

  const sp = Math.hypot(B.vx, B.vy), vmax = 17 * c;
  if (sp > vmax) { B.vx *= vmax / sp; B.vy *= vmax / sp; }
  B.x += B.vx * dt; B.y += B.vy * dt;

  let hitV = 0, hitN = null, hitRc = null, hitEdge = null;
  for (const rc of g.rects) {
    if (B.hz >= rc.h - c * .03) continue;
    const qx = clamp(B.x, rc.x0, rc.x1), qy = clamp(B.y, rc.y0, rc.y1);
    const dx = B.x - qx, dy = B.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx, ny, pen;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = r - d; }
    else {
      const o = [[B.x - rc.x0, -1, 0], [rc.x1 - B.x, 1, 0], [B.y - rc.y0, 0, -1], [rc.y1 - B.y, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      nx = o[1]; ny = o[2]; pen = o[0] + r;
    }
    B.x += nx * pen; B.y += ny * pen;
    const vn = B.vx * nx + B.vy * ny;
    if (vn < 0) {
      B.vx -= 1.42 * vn * nx; B.vy -= 1.42 * vn * ny; B.vx *= .985; B.vy *= .985;
      if (-vn > hitV) { hitV = -vn; hitN = [nx, ny]; hitRc = rc; hitEdge = null; }
    }
  }
  // bumpers : ils renvoient la bille plus fort qu'elle n'est arrivée
  for (const b of g.bumpers) {
    if (B.hz >= b.h - c * .03) continue;
    const dx = B.x - b.x, dy = B.y - b.y, d = Math.hypot(dx, dy), rr = r + b.R;
    if (d >= rr) continue;
    const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : -1;
    B.x = b.x + nx * rr; B.y = b.y + ny * rr;
    const vn = B.vx * nx + B.vy * ny;
    if (vn < 0 && !attract) {
      const out = Math.max(-vn * 1.3, 8 * c);
      B.vx += (out - vn) * nx; B.vy += (out - vn) * ny;
      bumperHit(b, nx, ny, out);
    } else if (vn < 0) { B.vx -= 1.6 * vn * nx; B.vy -= 1.6 * vn * ny; }
  }
  const edge = (cond, vel, n, name, fix) => { if (cond) { fix(); if (vel > 0) { if (vel > hitV) { hitV = vel; hitN = n; hitRc = null; hitEdge = name; } return true; } } return false; };
  if (edge(B.x < r, -B.vx, [1, 0], 'l', () => { B.x = r; })) B.vx *= -.42;
  if (edge(B.x > g.WW - r, B.vx, [-1, 0], 'r', () => { B.x = g.WW - r; })) B.vx *= -.42;
  if (edge(B.y < r, -B.vy, [0, 1], 't', () => { B.y = r; })) B.vy *= -.42;
  if (edge(B.y > g.HH - r, B.vy, [0, -1], 'b', () => { B.y = g.HH - r; })) B.vy *= -.42;
  if (hitV > 1.4 * c) impact(hitV, hitN, hitRc, hitEdge);

  // téléporteurs
  if (!attract && B.tpCD <= 0 && B.hz < c * .15) for (const p of g.portals) {
    if (Math.hypot(B.x - p.x, B.y - p.y) < p.R * .75) { teleport(p); break; }
  }

  const ground = groundAt(B.x, B.y);
  if (B.hz > ground + 1e-4 || B.vz > 0) { B.onGround = false; B.vz -= GV * dt; B.hz += B.vz * dt; }
  if (B.hz <= ground) {
    if (!B.onGround && B.vz < -2.2 * c) { landing(-B.vz, ground); B.hz = ground; B.vz = -B.vz * .32; B.air2 = false; }
    else { B.hz = ground; B.vz = 0; B.onGround = true; B.air2 = false; }
  }

  const v2 = Math.hypot(B.vx, B.vy);
  if (v2 > 1e-3) {
    B.rot = mul3(rotAxis(-B.vy / v2, B.vx / v2, 0, v2 * dt / r), B.rot);
    if (++B.rotN % 240 === 0) B.rot = ortho(B.rot);
  }
  if (!attract) stepCoins(dt);
}
function bumperHit(b, nx, ny, out) {
  const c = geo.c, s = Math.min(1, out / (14 * c));
  b.pulse = 1; sfx.bump(); buzz(18);
  const x = b.x + nx * b.R, y = b.y + ny * b.R, z = D - geo.r - B.hz;
  bursts.push({ x, y, z, a: Math.atan2(ny, nx), t: 0, life: .26, s: .6 + s * .4 });
  spray(x, y, z, 10, ['#fff3c4', '#f2b544', '#e2483d'], 4 + s * 4, 2, Math.atan2(ny, nx), 1.2);
  B.sq = { amp: .28, ang: Math.atan2(ny, nx), t: 0, radial: false };
  addShake(c * .08);
}
function teleport(p) {
  const q = p.to; if (!q) return;
  rings.push({ x: p.x, y: p.y, z: D, t: 0, life: .4, r0: p.R * .4, r1: p.R * 2.2, col: PORTAL_COL[p.id][0] });
  B.x = q.x; B.y = q.y; B.tpCD = .8; B.trail = [];
  rings.push({ x: q.x, y: q.y, z: D, t: 0, life: .5, r0: q.R * 2.2, r1: q.R * .4, col: PORTAL_COL[q.id][0] });
  spray(q.x, q.y, D - geo.r, 14, [PORTAL_COL[q.id][0], '#f3e9d2'], 3, 3);
  p.glow = q.glow = 1; cam.rate = 7; sfx.warp(); buzz(20);
}

function startSink(h) {
  B.state = 'sink'; B.sink = { h, t: 0, x0: B.x, y0: B.y }; B.trail = [];
  if (h.goal) { sfx.win(); buzz([20, 40, 20, 40, 60]); }
  else { sfx.fall(); buzz(70); }
}
function stepSink(dt) {
  const s = B.sink; s.t += dt;
  const k = Math.min(1, s.t / .42), e = 1 - (1 - k) * (1 - k);
  B.x = lerp(s.x0, s.h.x, e); B.y = lerp(s.y0, s.h.y, e);
  if (s.t > .75) { B.state = 'gone'; onSunk(s.h); }
}
function onSunk(h) {
  const c = geo.c;
  if (h.goal) {
    G.mode = 'won'; G.won++;
    spray(h.x, h.y, D, 46, ['#f2b544', '#fff3c4', '#e2483d', '#f3e9d2'], 6, 14, null, Math.PI, 1);
    rings.push({ x: h.x, y: h.y, z: D, t: 0, life: .6, r0: h.R, r1: h.R * 5, gold: true });
    addShake(c * .25); flash('#f2b544', .3, 500);
    setTimeout(showCash, 900);
    return;
  }
  spray(h.x, h.y, D, 16, ['#0b1412', '#1a2b25', '#3a4a44'], 1.2, 3);
  addShake(c * .2); flash('#9b2a25', .28, 420);
  G.fell = true;
  if (has('net') && !G.netUsed) {
    G.netUsed = true; sfx.net(); toast('Filet ! La bille repart du départ.');
    placeBall(true); return;
  }
  // la bille est perdue pour de bon
  const lostKind = G.rack[G.cur];
  G.rack.splice(G.cur, 1); sfx.lose(); renderHud(); renderRack(G.cur);
  if (!G.rack.length) { G.mode = 'over'; setTimeout(() => showEnd('over'), 700); return; }
  const same = G.rack.indexOf(lostKind);
  G.cur = same >= 0 ? same : Math.min(G.cur, G.rack.length - 1);
  toast(G.rack.length === 1 ? 'Dernière bille !' : `${BALLS[lostKind].name} perdue. Il te reste ${G.rack.length} billes.`);
  setTimeout(() => { if (G.mode === 'play') promptChoose(); }, 450);
}

function tryJump() {
  if (G.mode !== 'play' || G.paused || G.choosing || !has('jump') || B.state !== 'roll') return;
  const vj = Math.sqrt(2 * 34 * geo.c * geo.c * 1.75);
  if (B.onGround && B.jumpCD <= 0) {
    B.vz = vj; B.onGround = false; B.jumpCD = 1.2; B.air2 = B.kind === 'dbl';
    B.sq = { amp: -.22, ang: 0, t: 0, radial: true };
    spray(B.x, B.y, D - B.hz - .5, 6, ['#4a9a78', '#f3e9d2'], 2.5, .5);
    sfx.jump(); buzz(15);
  } else if (!B.onGround && B.air2) {
    B.air2 = false; B.vz = vj * .9; B.jumpCD = 1.2;
    rings.push({ x: B.x, y: B.y, z: D - geo.r - B.hz, t: 0, life: .3, r0: geo.r, r1: geo.r * 2.4, col: '#8b6be0' });
    tone(320, .18, 'triangle', .2, 0, 820); buzz(15);
  }
}

/* ---------------- Pièces ---------------- */
function stepCoins(dt) {
  const g = geo, c = g.c;
  for (const cn of g.coins) {
    if (cn.taken) continue;
    const dx = B.x - cn.x, dy = B.y - cn.y, d = Math.hypot(dx, dy);
    if (cn.fly) {
      cn.sp = (cn.sp || 2 * c) + 40 * c * dt;
      const m = Math.min(d, cn.sp * dt);
      if (d > 1e-3) { cn.x += dx / d * m; cn.y += dy / d * m; }
      cn.h = lerp(cn.h, g.wallH + c * .5 + B.hz, Math.min(1, dt * 8));
      if (d < g.r * 1.2) collect(cn);
    } else {
      const reach = g.r + c * (cn.big ? .42 : .3);
      if (d < reach && B.hz < cn.h + c * .3 && B.hz + 2 * g.r > cn.h - c * .5) collect(cn);
      else if (has('magnet') && !cn.big && d < c * 2.8 && B.state === 'roll') cn.fly = true;
    }
  }
}
function collect(cn) {
  cn.taken = true; cn.pop = 0; G.taken.add(cn.i);
  G.combo = G.comboT > 0 ? G.combo + 1 : 0; G.comboT = 1.3;
  const bonus = has('chain') ? Math.min(G.combo, 3) : 0;
  const val = cn.base + (has('gold') ? 1 : 0) + bonus;
  cn.val = val;
  G.money += val; G.earned += val; G.roundCoins++;
  sfx.coin(G.combo); buzz(cn.big ? 25 : 8);
  const z = D - cn.h;
  spray(cn.x, cn.y, z, cn.big ? 18 : 10, ['#f2b544', '#fff3c4'], 4, 3);
  rings.push({ x: cn.x, y: cn.y, z, t: 0, life: .3, r0: geo.c * .2, r1: geo.c * (cn.big ? 1.4 : .8), gold: true });
  texts.push({ x: cn.x, y: cn.y, z: z - geo.c * .3, txt: '+$' + val + (bonus ? '  série ×' + (G.combo + 1) : ''), life: .9, max: .9 });
}
function screenOf(x, y, z) {
  const [px, py] = P(x, y, z), rc = cv.getBoundingClientRect();
  return [rc.left + (px + OX) * rc.width / W, rc.top + (py + OY) * rc.height / H];
}
function flyCoin(sx, sy, val) {
  const tgt = $('#hMoney').getBoundingClientRect();
  if (!tgt.width || REDUCED) { G.shown = Math.min(G.money, G.shown + val); renderMoney(true); return; }
  const img = document.createElement('img'); img.src = COIN_URL; img.className = 'flycoin'; img.alt = '';
  document.body.appendChild(img);
  const x1 = tgt.left + 4, y1 = tgt.top + tgt.height * .25;
  const mx = lerp(sx, x1, .35) + rnd(-50, 50), my = Math.min(sy, y1) + (sy - y1) * .25 - 30;
  const a = img.animate([
    { transform: `translate(${sx - 12}px,${sy - 12}px) scale(1.5) rotate(0deg)` },
    { transform: `translate(${mx - 12}px,${my - 12}px) scale(1.2) rotate(180deg)`, offset: .45 },
    { transform: `translate(${x1 - 12}px,${y1 - 12}px) scale(.7) rotate(360deg)` }
  ], { duration: rnd(520, 640), easing: 'cubic-bezier(.45,0,.8,.6)' });
  a.onfinish = () => { img.remove(); G.shown = Math.min(G.money, G.shown + val); renderMoney(true); sfx.tick(1568 + Math.random() * 300); };
}

function stepFx(dt) {
  const c = geo.c;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.float) { p.vx *= .97; p.vy *= .97; p.z += p.vz * dt; }
    else {
      const k = Math.exp(-2.2 * dt); p.vx *= k; p.vy *= k;
      p.vz += 30 * c * dt; p.z += p.vz * dt;
      if (p.z < .5) { p.z = .5; p.vz = Math.abs(p.vz) * .3; }
      if (p.z > D) { p.z = D; p.vz = -p.vz * .25; p.vx *= .5; p.vy *= .5; }
    }
  }
  for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life -= dt; t.z -= c * 1.2 * dt; if (t.life <= 0) texts.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > rings[i].life) rings.splice(i, 1); }
  for (let i = bursts.length - 1; i >= 0; i--) { bursts[i].t += dt; if (bursts[i].t > bursts[i].life) bursts.splice(i, 1); }
  for (const rc of geo.rects) rc.flash = Math.max(0, rc.flash - dt * 4);
  for (const b of geo.bumpers) b.pulse = Math.max(0, b.pulse - dt * 4);
  for (const p of geo.portals) p.glow = Math.max(0, p.glow - dt * 2);
  for (const k in edgeFlash) edgeFlash[k] = Math.max(0, edgeFlash[k] - dt * 4);
  if (B.sq) { B.sq.t += dt; if (B.sq.t > .45) B.sq = null; }
  if (G.comboT > 0) G.comboT -= dt;
  for (const cn of geo.coins) if (cn.pop >= 0) {
    cn.pop += dt; cn.h += c * 2.2 * dt;
    if (cn.pop > .16) { const [sx, sy] = screenOf(cn.x, cn.y, D - cn.h); cn.pop = -1; flyCoin(sx, sy, cn.val || 1); }
  }
  for (const m of motes) { m.x += m.vx * dt; m.y += m.vy * dt; }
  if (G.mode === 'play' || G.mode === 'title') for (const h of geo.holes) if (h.goal && Math.random() < dt * 9) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * h.R * .7;
    parts.push({ x: h.x + Math.cos(a) * rr, y: h.y + Math.sin(a) * rr, z: D, vx: 0, vy: 0, vz: -rnd(1, 2.2) * c, life: rnd(.9, 1.6), max: 1.6, col: Math.random() < .5 ? '#ffd36b' : '#fff3c4', float: true, size: 1 });
  }
  if (B.state === 'roll') { B.trail.push({ x: B.x, y: B.y, z: D - geo.r - B.hz }); if (B.trail.length > 7) B.trail.shift(); }
}

/* ---------------- Rendu ---------------- */
const COL = {
  bg: '#0b1112',
  boxTop: '#1d1217', boxLeft: '#25161c', boxRight: '#3a2530', boxBottom: '#452e38', rim: '#5c3b45',
  top: '#cf463c', topHi: '#ec7a5c', topLo: '#8f2a2a', inlay: '#e8b04a',
  north: '#b33c34', west: '#a3352f', east: '#6a1e25', south: '#7a2329', band: '#c48530', contact: '#2a0b0f',
  lTop: '#b5793b', lHi: '#d99a55', lLo: '#7a4a22', lNorth: '#9a6230', lWest: '#8d592b', lEast: '#5e3a1b', lSouth: '#6b4220',
};
const PORTAL_COL = { 1: ['#3fd6e6', '#0e3440'], 2: ['#e070e6', '#3a1240'], 3: ['#a6e85a', '#22401a'], 4: ['#f39a4a', '#4a2410'] };
function mixHex(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',') + ')';
}
const TRAP_STEPS = Array.from({ length: 8 }, (_, i) => mixHex('#143a2c', '#020303', Math.pow(i / 7, .6)));
const GOAL_STEPS = Array.from({ length: 8 }, (_, i) => mixHex('#3a2a0e', '#ffd36b', Math.pow(i / 7, 2.2)));

function poly(pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
function disc(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }

function drawBox() {
  const g = geo, X = g.WW, Y = g.HH;
  const a0 = P(0, 0, 0), b0 = P(X, 0, 0), c0 = P(X, Y, 0), d0 = P(0, Y, 0);
  const a1 = P(0, 0, D), b1 = P(X, 0, D), c1 = P(X, Y, D), d1 = P(0, Y, D);
  if (g.scroll) {   // rebord de la boîte, au niveau de la vitre
    const m = g.c * .7;
    ctx.beginPath();
    ctx.rect(a0[0] - m, a0[1] - m, c0[0] - a0[0] + 2 * m, c0[1] - a0[1] + 2 * m);
    ctx.rect(a0[0], a0[1], c0[0] - a0[0], c0[1] - a0[1]);
    ctx.fillStyle = COL.rim; ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(201,139,50,.7)'; ctx.lineWidth = 1; ctx.strokeRect(a0[0] - .5, a0[1] - .5, c0[0] - a0[0] + 1, c0[1] - a0[1] + 1);
  }
  const faces = [
    ['t', a1[1] > a0[1], [a0, b0, b1, a1], COL.boxTop],
    ['b', d1[1] < d0[1], [d0, d1, c1, c0], COL.boxBottom],
    ['l', a1[0] > a0[0], [a0, a1, d1, d0], COL.boxLeft],
    ['r', b1[0] < b0[0], [b0, c0, c1, b1], COL.boxRight],
  ];
  for (const [k, vis, pts, col] of faces) {
    if (!vis) continue;
    poly(pts, col);
    if (edgeFlash[k] > 0) { ctx.globalAlpha = edgeFlash[k] * .55; poly(pts, '#f3c78a'); ctx.globalAlpha = 1; }
  }
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
  for (const k of [.33, .66]) {
    const z = D * k, a = P(0, 0, z), b = P(X, 0, z), c2 = P(X, Y, z), d2 = P(0, Y, z);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.closePath(); ctx.stroke();
  }
}

function drawHole(h, time) {
  const z0 = D, z1 = D + h.depth;
  const [ox, oy] = P(h.x, h.y, z0), orad = h.R * tz(z0);
  if (ox < -orad * 3 || oy < -orad * 3 || ox > W + orad * 3 || oy > H + orad * 3) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(ox, oy, orad, 0, TAU); ctx.clip();
  const steps = h.goal ? GOAL_STEPS : TRAP_STEPS;
  for (let i = 0; i < steps.length; i++) {
    const k = i / (steps.length - 1), z = z0 + (z1 - z0) * k;
    const [x, y] = P(h.x, h.y, z); disc(x, y, h.R * tz(z) * (i === steps.length - 1 ? 1 : 1.02), steps[i]);
  }
  if (h.goal) {
    const [x, y] = P(h.x, h.y, z1);
    ctx.globalAlpha = .35 + .25 * Math.sin(time * 4);
    disc(x, y, h.R * tz(z1) * .55, '#fff6d6'); ctx.globalAlpha = 1;
  }
  if (B.sink && B.sink.h === h && B.state === 'sink') {
    const k = Math.min(1, B.sink.t / .7);
    drawBall(B.x, B.y, D - geo.r + h.depth * .95 * k * k, k * .75);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(1, geo.c * .07);
  ctx.strokeStyle = h.goal ? '#f2b544' : h.mv ? '#3a0f0d' : '#0a0d0e';
  ctx.beginPath(); ctx.arc(ox, oy, orad, 0, TAU); ctx.stroke();
  if (h.goal) {
    ctx.globalAlpha = .25 + .2 * Math.sin(time * 3);
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, orad * (1.25 + .06 * Math.sin(time * 3)), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = h.mv ? 'rgba(226,72,61,.55)' : 'rgba(243,233,210,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, oy, orad + 1, Math.PI * .1, Math.PI * .9); ctx.stroke();
  }
}
function drawPortal(p, time) {
  const [x, y] = P(p.x, p.y, D), rr = p.R * tz(D), [cA, cB] = PORTAL_COL[p.id];
  disc(x, y, rr * 1.08, cB);
  ctx.strokeStyle = cA; ctx.lineWidth = Math.max(1, rr * .13);
  for (let k = 0; k < 3; k++) {
    const a0 = time * (2.4 + k * .8) * (k % 2 ? -1 : 1) + k * 2;
    ctx.beginPath(); ctx.arc(x, y, rr * (.32 + k * .26), a0, a0 + 1.9); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .35 + .2 * Math.sin(time * 5) + p.glow * .5;
  disc(x, y, rr * (.5 + p.glow * .6), cA);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawGoalBeam(time) {
  ctx.globalCompositeOperation = 'lighter';
  for (const h of geo.holes) if (h.goal) {
    for (let k = 0; k < 7; k++) {
      const z = D * (1 - k / 7.5), [x, y] = P(h.x, h.y, z);
      ctx.globalAlpha = (.05 + .02 * Math.sin(time * 3 + k)) * (1 - k / 9);
      disc(x, y, h.R * tz(z) * (1 - k * .05), '#f2b544');
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawShadow(x, y, groundZ, height, rad, alpha) {
  atDepth(groundZ);
  const off = rad * .35 + height * .7;
  ctx.globalAlpha = alpha / (1 + height / (geo.c * .9));
  disc(x + off * .55, y + off * .8, rad * (1 + height / (geo.c * 4)), '#000');
  ctx.globalAlpha = 1; reset();
}

const SPOTS = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(c => c / Math.sqrt(3)));
function squashFactor() { if (!B.sq) return 0; const t = B.sq.t; return B.sq.amp * Math.exp(-t * 11) * Math.cos(t * 36); }
function drawBall(x, y, z, dark = 0) {
  const [px, py] = P(x, y, z), pr = geo.r * tz(z), k = BALLS[B.kind] || BALLS.plain;
  ctx.save();
  const a = squashFactor();
  if (a && dark === 0) {
    ctx.translate(px, py);
    if (B.sq.radial) ctx.scale(1 + a * .6, 1 + a * .6);
    else { ctx.rotate(B.sq.ang); ctx.scale(1 - a, 1 + a * .55); ctx.rotate(-B.sq.ang); }
    ctx.translate(-px, -py);
  }
  const gr = ctx.createRadialGradient(px - pr * .35, py - pr * .4, pr * .1, px, py, pr);
  gr.addColorStop(0, k.col[0]); gr.addColorStop(.55, k.col[1]); gr.addColorStop(1, k.col[2]);
  disc(px, py, pr, gr);
  for (const s of SPOTS) {
    const m = B.rot, w0 = m[0]*s[0] + m[1]*s[1] + m[2]*s[2], w1 = m[3]*s[0] + m[4]*s[1] + m[5]*s[2], w2 = m[6]*s[0] + m[7]*s[1] + m[8]*s[2];
    if (w2 <= .05) continue;
    const rr = pr * .24;
    ctx.beginPath();
    ctx.ellipse(px + w0 * pr * .92, py + w1 * pr * .92, Math.max(.4, rr * w2), rr, Math.atan2(w1, w0), 0, TAU);
    ctx.fillStyle = k.spot; ctx.fill();
  }
  disc(px - pr * .38, py - pr * .42, pr * .2, 'rgba(255,255,255,.85)');
  if (anchorHeld && has('anchor') && dark === 0) { ctx.strokeStyle = 'rgba(242,181,68,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, pr + 2, 0, TAU); ctx.stroke(); }
  if (dark > 0) { ctx.globalAlpha = dark; disc(px, py, pr + .5, '#000'); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawTrail() {
  const sp = Math.hypot(B.vx, B.vy) / geo.c;
  if (sp < 6 || B.trail.length < 3) return;
  const k = Math.min(1, (sp - 6) / 8), n = B.trail.length, col = (BALLS[B.kind] || BALLS.plain).col[0];
  for (let i = 0; i < n - 1; i++) {
    const p = B.trail[i], [x, y] = P(p.x, p.y, p.z), f = i / n;
    ctx.globalAlpha = f * .28 * k;
    disc(x, y, geo.r * tz(p.z) * (.5 + .45 * f), col);
  }
  ctx.globalAlpha = 1;
}
function drawBallWithShadow(ground) {
  if (ground > 0) drawShadow(B.x, B.y, D - ground, B.hz - ground, geo.r, .5);
  drawTrail(); drawBall(B.x, B.y, D - geo.r - B.hz);
}

function coinZ(cn, time) { return D - cn.h - (cn.fly || cn.pop >= 0 ? 0 : Math.sin(time * 2.2 + cn.phase) * geo.c * .1); }
function drawCoin(cn, time) {
  const z = coinZ(cn, time);
  const [px, py] = P(cn.x, cn.y, z), t = tz(z);
  if (px < -40 || py < -40 || px > W + 40 || py > H + 40) return;
  const popping = cn.pop >= 0;
  const pr = geo.c * (cn.big ? .42 : .3) * t * (popping ? 1 + cn.pop * 3 : 1);
  const ang = time * (popping ? 18 : cn.big ? 2.2 : 3.1) + cn.phase;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  const w = Math.max(.6, Math.abs(cs) * pr), th = pr * .28 * Math.abs(sn);
  const dir = sn > 0 ? 1 : -1;
  if (popping) ctx.globalAlpha = Math.max(0, 1 - cn.pop / .16);
  if (th > .3) {
    ctx.beginPath(); ctx.ellipse(px - dir * th / 2, py, w, pr, 0, 0, TAU); ctx.fillStyle = '#7a4f12'; ctx.fill();
    ctx.fillStyle = '#a8721f'; ctx.fillRect(px - th / 2, py - pr, th, pr * 2);
  }
  const fx = px + dir * th / 2;
  ctx.beginPath(); ctx.ellipse(fx, py, w, pr, 0, 0, TAU); ctx.fillStyle = '#a8721f'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(fx, py, w * .8, pr * .8, 0, 0, TAU); ctx.fillStyle = cn.big ? '#ffd36b' : '#f2b544'; ctx.fill();
  if (w > pr * .4) {
    ctx.fillStyle = '#c98b32';
    const bw = Math.max(1, w * .22), bh = pr * .9;
    ctx.fillRect(Math.round(fx - bw / 2), Math.round(py - bh / 2), Math.round(bw), Math.round(bh));
    if (cn.big) ctx.fillRect(Math.round(fx - w * .45), Math.round(py - 1), Math.round(w * .9), 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(Math.round(fx - w * .55), Math.round(py - pr * .45), 1, Math.max(1, Math.round(pr * .7)));
  }
  if (((time * .8 + cn.phase) % (cn.big ? 1.6 : 3.2)) < .14 && !popping) {
    ctx.fillStyle = '#fffbea';
    const gx = Math.round(fx - w * .3), gy = Math.round(py - pr * .5), L = Math.max(2, Math.round(pr * .7));
    ctx.fillRect(gx - L, gy, L * 2 + 1, 1); ctx.fillRect(gx, gy - L, 1, L * 2 + 1);
  }
  ctx.globalAlpha = 1;
}
function drawCoinGlows(time) {
  ctx.globalCompositeOperation = 'lighter';
  atDepth(D);
  for (const cn of geo.coins) {
    if (cn.taken || cn.fly) continue;
    const k = .75 + .25 * Math.sin(time * 2.2 + cn.phase), R = geo.c * (cn.big ? 1 : .7);
    const gr = ctx.createRadialGradient(cn.x, cn.y, 0, cn.x, cn.y, R);
    gr.addColorStop(0, `rgba(242,181,68,${(cn.big ? .24 : .16) * k})`); gr.addColorStop(1, 'rgba(242,181,68,0)');
    ctx.fillStyle = gr; ctx.fillRect(cn.x - R, cn.y - R, R * 2, R * 2);
  }
  reset(); ctx.globalCompositeOperation = 'source-over';
}
function drawBumper(b) {
  const n = 5, pul = b.pulse;
  for (let i = 0; i <= n; i++) {
    const k = i / n, z = D - b.h * k, [x, y] = P(b.x, b.y, z), rr = b.R * tz(z) * (1 + pul * .2 * k);
    disc(x, y, rr, i === n ? '#e2483d' : (i % 2 ? '#8f2a2a' : '#b3372f'));
  }
  const z = D - b.h, [x, y] = P(b.x, b.y, z), rr = b.R * tz(z) * (1 + pul * .2);
  ctx.strokeStyle = '#f2b544'; ctx.lineWidth = Math.max(1, rr * .18);
  ctx.beginPath(); ctx.arc(x, y, rr * .74, 0, TAU); ctx.stroke();
  disc(x, y, rr * .34, pul > 0 ? mixHex('#f2b544', '#ffffff', pul) : '#f2b544');
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(Math.round(x - rr * .55), Math.round(y - rr * .6), Math.max(1, Math.round(rr * .25)), 1);
  if (pul > .3) { ctx.globalAlpha = pul * .5; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr * (1.2 + (1 - pul)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}

function drawSides(rc) {
  const zb = D, zt = D - rc.h, low = rc.low;
  const face = (ax, ay, bx, by, col) => {
    const p1 = P(ax, ay, zb), p2 = P(bx, by, zb), p3 = P(bx, by, zt), p4 = P(ax, ay, zt);
    poly([p1, p2, p3, p4], col);
    if (rc.flash > 0) { ctx.globalAlpha = rc.flash * .6; poly([p1, p2, p3, p4], '#ffd9b0'); ctx.globalAlpha = 1; }
    if (!low) {
      const k = .3, q1 = [lerp(p4[0], p1[0], k), lerp(p4[1], p1[1], k)], q2 = [lerp(p3[0], p2[0], k), lerp(p3[1], p2[1], k)];
      ctx.strokeStyle = COL.band; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
    }
    ctx.strokeStyle = COL.contact; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  };
  if (eyeW.y < rc.y0) face(rc.x0, rc.y0, rc.x1, rc.y0, low ? COL.lNorth : COL.north);
  if (eyeW.y > rc.y1) face(rc.x0, rc.y1, rc.x1, rc.y1, low ? COL.lSouth : COL.south);
  if (eyeW.x < rc.x0) face(rc.x0, rc.y0, rc.x0, rc.y1, low ? COL.lWest : COL.west);
  if (eyeW.x > rc.x1) face(rc.x1, rc.y0, rc.x1, rc.y1, low ? COL.lEast : COL.east);
}
function drawTop(rc) {
  const t = atDepth(D - rc.h), px = 1 / t, w = rc.x1 - rc.x0, h = rc.y1 - rc.y0, low = rc.low;
  ctx.fillStyle = low ? COL.lTop : COL.top; ctx.fillRect(rc.x0, rc.y0, w, h);
  ctx.fillStyle = low ? COL.lHi : COL.topHi; ctx.fillRect(rc.x0, rc.y0, w, px); ctx.fillRect(rc.x0, rc.y0, px, h);
  ctx.fillStyle = low ? COL.lLo : COL.topLo; ctx.fillRect(rc.x0, rc.y1 - px, w, px); ctx.fillRect(rc.x1 - px, rc.y0, px, h);
  if (low) {   // planches de la barrière
    ctx.fillStyle = COL.lLo;
    if (w >= h) for (let x = rc.x0 + geo.cw * .5; x < rc.x1 - 1; x += geo.cw * .5) ctx.fillRect(x, rc.y0, px, h);
    else for (let y = rc.y0 + geo.ch * .5; y < rc.y1 - 1; y += geo.ch * .5) ctx.fillRect(rc.x0, y, w, px);
  } else {
    const ins = Math.min(w, h) * .24;
    if (ins > 2 * px) { ctx.strokeStyle = COL.inlay; ctx.lineWidth = px; ctx.strokeRect(rc.x0 + ins, rc.y0 + ins, w - 2 * ins, h - 2 * ins); }
  }
  if (rc.flash > 0) { ctx.globalAlpha = rc.flash * .55; ctx.fillStyle = '#fff1d6'; ctx.fillRect(rc.x0, rc.y0, w, h); ctx.globalAlpha = 1; }
  reset();
}
const rectDist = rc => Math.hypot(Math.max(rc.x0 - eyeW.x, 0, eyeW.x - rc.x1), Math.max(rc.y0 - eyeW.y, 0, eyeW.y - rc.y1));
const dEye = (x, y) => Math.hypot(x - eyeW.x, y - eyeW.y);

function drawRings() {
  for (const r of rings) {
    const k = r.t / r.life, t = atDepth(r.z);
    ctx.globalAlpha = (1 - k) * (r.gold || r.col ? .8 : .5);
    ctx.strokeStyle = r.col || (r.gold ? '#ffd36b' : '#f3e9d2'); ctx.lineWidth = Math.max(1, (1 - k) * 2) / t;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(.5, lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 2))), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1; reset();
}
function drawBursts() {
  for (const b of bursts) {
    const k = b.t / b.life, [x, y] = P(b.x, b.y, b.z), c = geo.c;
    const L0 = c * (.2 + k * .7) * (.6 + b.s), L1 = L0 + c * .35 * (1 - k) * (.6 + b.s);
    ctx.strokeStyle = k < .35 ? '#ffffff' : '#ffe2a8'; ctx.lineWidth = k < .4 ? 2 : 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const a = b.a + i * .42;
      ctx.moveTo(x + Math.cos(a) * L0, y + Math.sin(a) * L0); ctx.lineTo(x + Math.cos(a) * L1, y + Math.sin(a) * L1);
    }
    ctx.stroke();
    if (k < .3) { ctx.globalAlpha = .9 * (1 - k / .3); disc(x, y, c * .22 * (1 + b.s), '#fff6e0'); }
  }
  ctx.globalAlpha = 1;
}
function drawParts() {
  for (const p of parts) {
    const [x, y] = P(p.x, p.y, p.z), s = Math.max(1, Math.round((p.size || 1) * tz(p.z)));
    ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.globalAlpha = 1;
}
function drawMotes(time) {
  ctx.fillStyle = '#f3e9d2';
  for (const m of motes) {
    const wx = cam.x + (((m.x - cam.x) % W) + W) % W, wy = cam.y + (((m.y - cam.y) % H) + H) % H;
    const [x, y] = P(wx, wy, m.z);
    ctx.globalAlpha = .1 + .18 * (.5 + .5 * Math.sin(time * 1.3 + m.ph)) * (1 - m.z / D * .6);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}
function drawGoalArrow(time) {
  if (!geo.scroll || G.mode !== 'play') return;
  const h = geo.holes.find(q => q.goal); if (!h) return;
  const [sx, sy] = P(h.x, h.y, D);
  const mx = 12, top = 62 / gpx + 6, bot = H - (64 / gpx + 6);
  if (sx > mx && sx < W - mx && sy > top && sy < bot) return;
  const cx = W / 2, cy = (top + bot) / 2, dx = sx - cx, dy = sy - cy;
  const kx = Math.abs(dx) > 1e-6 ? (W / 2 - mx) / Math.abs(dx) : Infinity;
  const ky = Math.abs(dy) > 1e-6 ? (dy < 0 ? cy - top : bot - cy) / Math.abs(dy) : Infinity;
  const k = Math.min(kx, ky), ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx);
  const s = geo.c * (.42 + .06 * Math.sin(time * 6));
  ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(ang);
  const tri = () => { ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * .7, -s * .75); ctx.lineTo(-s * .3, 0); ctx.lineTo(-s * .7, s * .75); ctx.closePath(); };
  ctx.translate(1, 1); tri(); ctx.fillStyle = '#2a1308'; ctx.fill();
  ctx.translate(-1, -1); tri(); ctx.fillStyle = '#f2b544'; ctx.fill();
  ctx.restore();
  const dist = Math.round(Math.hypot(h.x - B.x, h.y - B.y) / geo.c);
  ctx.font = `${Math.round(geo.c * .5)}px "Jersey 10", monospace`; ctx.textAlign = 'center';
  const tx = Math.round(ax - Math.cos(ang) * s * 1.7), ty = Math.round(ay - Math.sin(ang) * s * 1.7 + s * .3);
  ctx.fillStyle = '#2a1308'; ctx.fillText(dist + ' m', tx + 1, ty + 1);
  ctx.fillStyle = '#f2b544'; ctx.fillText(dist + ' m', tx, ty);
}
function drawGlass() {
  const ox = (eye.x - W / 2) * .6, oy = (eye.y - H / 2) * .3;
  const gr = ctx.createLinearGradient(ox - W * .2, oy, ox + W * .9, oy + H * .7);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.42, 'rgba(255,255,255,0)');
  gr.addColorStop(.47, 'rgba(255,255,255,.075)'); gr.addColorStop(.52, 'rgba(255,255,255,0)');
  gr.addColorStop(.58, 'rgba(255,255,255,.035)'); gr.addColorStop(.61, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(-OX, -OY, W, H);
  if (ts < .97) { ctx.fillStyle = `rgba(95,198,208,${(1 - ts) * .18})`; ctx.fillRect(-OX, -OY, W, H); }
  ctx.strokeStyle = COL.rim; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.strokeStyle = 'rgba(201,139,50,.6)'; ctx.lineWidth = 1; ctx.strokeRect(2.5, 2.5, W - 5, H - 5);
  if (!geo.scroll) for (const [k, x0, y0, x1, y1] of [['l', 1, 0, 1, H], ['r', W - 1, 0, W - 1, H], ['t', 0, 1, W, 1], ['b', 0, H - 1, W, H - 1]]) {
    if (edgeFlash[k] <= 0) continue;
    ctx.globalAlpha = edgeFlash[k]; ctx.strokeStyle = '#ffe2a8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function render(time) {
  const g = geo; if (!g) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
  E = W * 1.35 / S.persp; D = g.wallH + g.c * .22;
  eyeW.x = eye.x + cam.x; eyeW.y = eye.y + cam.y;
  reset();
  drawBox();
  atDepth(D); ctx.drawImage(floorCv, 0, 0); reset();
  drawCoinGlows(time);
  for (const h of g.holes) drawHole(h, time);
  for (const p of g.portals) drawPortal(p, time);

  const ballVisible = B.state === 'roll';
  const ballGround = ballVisible ? groundAt(B.x, B.y) : 0;
  const ballHigh = ballVisible && B.hz >= g.maxH - g.c * .05;
  const ballAir = ballVisible && !ballHigh && B.hz >= g.lowH * .8;    // au-dessus des murs bas
  if (ballVisible && ballGround === 0) drawShadow(B.x, B.y, D, B.hz, g.r, .5);
  for (const cn of g.coins) if (!cn.taken && !cn.fly) drawShadow(cn.x, cn.y, D, D - coinZ(cn, time), g.c * (cn.big ? .32 : .24), .32);
  for (const b of g.bumpers) drawShadow(b.x, b.y, D, g.c * .3, b.R, .35);
  drawRings();

  // peintre : du plus loin de l'œil au plus proche, puis les dessus des murs hauts
  const items = [];
  for (const rc of g.rects) items.push({ d: rectDist(rc), rc });
  if (ballVisible && !ballHigh && !ballAir) items.push({ d: dEye(B.x, B.y), ball: true });
  for (const cn of g.coins) if (!cn.taken && !cn.fly) items.push({ d: dEye(cn.x, cn.y) - (cn.big ? g.c * 1.2 : 0), cn });
  for (const b of g.bumpers) items.push({ d: dEye(b.x, b.y), b });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) {
    if (it.rc) { drawSides(it.rc); if (it.rc.low) drawTop(it.rc); }
    else if (it.ball) drawBallWithShadow(0);
    else if (it.cn) drawCoin(it.cn, time);
    else drawBumper(it.b);
  }
  if (ballAir) drawBallWithShadow(ballGround);
  for (const rc of g.rects) if (!rc.low) drawTop(rc);
  if (ballHigh) drawBallWithShadow(ballGround);
  for (const cn of g.coins) if ((!cn.taken && cn.fly) || cn.pop >= 0) drawCoin(cn, time);

  drawGoalBeam(time);
  drawParts();
  drawBursts();
  if (texts.length) {
    ctx.font = `${Math.round(g.c * .62)}px "Jersey 10", monospace`; ctx.textAlign = 'center';
    for (const t of texts) {
      const [x, y] = P(t.x, t.y, t.z); ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      ctx.fillStyle = '#2a1308'; ctx.fillText(t.txt, Math.round(x) + 1, Math.round(y) + 1);
      ctx.fillStyle = '#f2b544'; ctx.fillText(t.txt, Math.round(x), Math.round(y));
    }
    ctx.globalAlpha = 1;
  }
  drawMotes(time);
  drawGoalArrow(time);
  drawGlass();
}

/* ---------------- Boucle ---------------- */
function slowTarget() {
  if (!has('slow') || G.mode !== 'play' || B.state !== 'roll' || !B.onGround) return 1;
  const c = geo.c;
  if (Math.hypot(B.vx, B.vy) < 2.5 * c) return 1;
  for (const h of geo.holes) if (!h.goal && Math.hypot(h.x - B.x, h.y - B.y) < c * 1.25) return .3;
  return 1;
}
function tick(dt, time) {
  readTilt(time, dt);
  const a = 1 - Math.exp(-dt * 18), b = 1 - Math.exp(-dt * 7);
  tilt.x += (tiltRaw.x - tilt.x) * a; tilt.y += (tiltRaw.y - tilt.y) * a;
  eyeT.x += (tilt.x - eyeT.x) * b; eyeT.y += (tilt.y - eyeT.y) * b;
  const gain = W * 1.05 * S.relief;
  eye.x = clamp(W / 2 - eyeT.x * gain, -W * .3, W * 1.3);
  eye.y = clamp(H / 2 - eyeT.y * gain, -H * .2, H * 1.2);
  shakeAmp *= Math.exp(-dt * 13);
  if (shakeAmp > .35) { OX = Math.round(rnd(-1, 1) * shakeAmp); OY = Math.round(rnd(-1, 1) * shakeAmp); } else { OX = OY = 0; }
  const prevTs = ts;
  ts += (slowTarget() - ts) * (1 - Math.exp(-dt * 12));
  if (prevTs > .8 && ts <= .8) tone(180, .25, 'sine', .12, 0, 90);
  const running = (G.mode === 'play' && !G.paused && !G.choosing) || G.mode === 'title';
  if (running && geo) { accT += dt * ts; const h = 1 / 120; let n = 0; while (accT >= h && n++ < 12) { step(h); accT -= h; } }
  else accT = 0;
  if (geo && !(G.mode === 'play' && G.paused)) stepFx(dt);
  updateCam(dt, false);
  checkSensors();
  if (AC && rollG) {
    const sp = Math.hypot(B.vx, B.vy), c = geo ? geo.c : 1;
    const on = running && B.state === 'roll' && B.onGround && G.mode !== 'title';
    const high = B.hz > 0, ice = on && floorAt(B.x, B.y) === 'i';
    rollG.gain.setTargetAtTime(on ? Math.min(1, sp / (10 * c)) * (ice ? .2 : .38) : 0, AC.currentTime, .04);
    rollF.frequency.setTargetAtTime((high ? 420 : ice ? 900 : 150) + sp / c * (high ? 70 : 42), AC.currentTime, .05);
  }
}
let last = now(), accT = 0, tiltEls = [], infoT = 0;
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  const time = t / 1000;
  tick(dt, time);
  render(time);
  if ($('#actBtn').dataset.k === 'jump') $('#actBtn').style.opacity = B.jumpCD > 0 && !B.air2 ? .5 : 1;
  if (G.mode === 'shop' && tiltEls.length) {
    const rx = (-eyeT.y * 34).toFixed(2), ry = (eyeT.x * 34).toFixed(2), sx = (50 - eyeT.x * 160).toFixed(1) + '%';
    for (const el of tiltEls) { el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; el.firstChild.style.setProperty('--sx', sx); }
  }
  if (!$('#sSettings').hidden && t - infoT > 250) { infoT = t; updateSensorInfo(); }
  requestAnimationFrame(frame);
}
function updateSensorInfo() {
  const el = $('#sensorInfo'), f = v => (v >= 0 ? '+' : '') + v.toFixed(0) + '°';
  let txt;
  if (SENS.src === 'orientation' && SENS.ori) txt = `Gyroscope · avant/arrière ${f(SENS.ori.b)} · gauche/droite ${f(SENS.ori.g)}`;
  else if (SENS.src === 'gravity' && SENS.grav) txt = `Accéléromètre · x ${SENS.grav.x.toFixed(1)} · y ${SENS.grav.y.toFixed(1)}`;
  else txt = SENS.grav ? 'Accéléromètre détecté, en attente' : 'Aucun mouvement reçu du navigateur' + (BRAVE ? ' (Brave les bloque)' : '');
  el.textContent = txt + ` · pente ${tilt.x.toFixed(2)} / ${tilt.y.toFixed(2)}`;
}

/* ---------------- Interface : HUD, réserve de billes, bulles ---------------- */
function renderMoney(bump) {
  const m = $('#hMoney'); m.textContent = '$' + G.shown;
  if (bump && !REDUCED) { m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
}
function renderHud() {
  $('#hRound').textContent = G.round;
  $('#hRoundLab').textContent = G.level && G.level.boss ? 'Boss' : 'Manche';
  $('#hBalls').textContent = G.rack.length;
  renderMoney(false);
}
let tipTimer = 0;
function showTip(kind, el) {
  const t = $('#tip'), k = BALLS[kind]; t.textContent = '';
  const ic = kind === 'plain' ? ballCanvas('plain', 12) : iconCanvas(kind, 4);
  const box = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span');
  b.textContent = k.name; s.textContent = k.desc; box.append(b, s); t.append(ic, box);
  t.hidden = false;
  const r = el.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
  t.style.left = clamp(r.left + r.width / 2 - tw / 2, 12, innerWidth - tw - 12) + 'px';
  t.style.top = Math.max(12, r.top - th - 10) + 'px';
  buzz(8); sfx.tick(660);
}
const hideTip = () => { $('#tip').hidden = true; };
/* Appui court = action, appui long = explication de la bille. */
function bindHold(el, kind, onTap) {
  let timer = 0, long = false;
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    e.stopPropagation(); long = false;
    clearTimeout(timer); timer = setTimeout(() => { long = true; showTip(kind, el); }, 380);
  });
  const end = e => { clearTimeout(timer); if (long) { hideTip(); long = false; return true; } return false; };
  el.addEventListener('pointerup', e => { if (!end(e) && onTap) onTap(); });
  el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap && onTap(); } });
}
function rackButton(kind, i) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'rb'; b.style.setProperty('--i', i);
  b.setAttribute('aria-label', BALLS[kind].name + ' : ' + BALLS[kind].desc);
  b.appendChild(ballCanvas(kind, 12));
  return b;
}
function renderRack(goneIndex = -1) {
  const el = $('#rack');
  const draw = () => {
    el.textContent = '';
    G.rack.forEach((kind, i) => {
      const b = rackButton(kind, i);
      if (i === G.cur && (G.mode === 'play' || G.choosing)) b.classList.add('cur');
      bindHold(b, kind, () => { if (G.choosing) launch(i); });
      el.appendChild(b);
    });
    el.classList.toggle('choose', G.choosing);
  };
  if (goneIndex >= 0 && el.children[goneIndex] && !REDUCED) {
    el.children[goneIndex].classList.add('gone'); setTimeout(draw, 480);
  } else draw();
}
function updateAct() {
  const btn = $('#actBtn');
  const k = B.kind === 'jump' || B.kind === 'dbl' ? 'jump' : B.kind === 'anchor' ? 'anchor' : '';
  btn.dataset.k = k;
  btn.hidden = !k || G.mode !== 'play' || G.choosing;
  btn.textContent = k === 'jump' ? 'Saut' : 'Frein';
}
$('#actBtn').addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  if ($('#actBtn').dataset.k === 'jump') tryJump();
  else { anchorHeld = true; $('#actBtn').classList.add('held'); buzz(10); }
});
const releaseAnchor = () => { if ($('#actBtn').dataset.k === 'anchor') { anchorHeld = false; $('#actBtn').classList.remove('held'); } };
$('#actBtn').addEventListener('pointerup', releaseAnchor);
$('#actBtn').addEventListener('pointercancel', releaseAnchor);
$('#actBtn').addEventListener('pointerleave', releaseAnchor);
$('#actBtn').addEventListener('contextmenu', e => e.preventDefault());

/* Choix de la bille avant chaque lancer (sauf si toutes les billes sont pareilles). */
function promptChoose() {
  if (!G.rack.length) return;
  G.cur = clamp(G.cur, 0, G.rack.length - 1);
  B.state = 'wait';
  if (new Set(G.rack).size === 1) { launch(G.cur); return; }
  G.choosing = true; $('#chooseHint').hidden = false; updateAct(); renderRack();
}
function launch(i) {
  if (i < 0 || i >= G.rack.length) return;
  G.cur = i; B.kind = G.rack[i]; G.choosing = false; $('#chooseHint').hidden = true;
  anchorHeld = false; hideTip(); sfx.pick();
  placeBall(true); renderRack(); updateAct();
}

let toastTimer = 0;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function letters(el, text) {
  el.textContent = '';
  [...text].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i); s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); });
}
function banner(a, b, c, boss) {
  const host = $('#bannerHost'); host.textContent = '';
  const d = document.createElement('div'); d.id = 'banner'; if (boss) d.className = 'boss';
  if (c) d.style.animationDuration = '3s';
  const b1 = document.createElement('div'); b1.className = 'b1'; letters(b1, a);
  const b2 = document.createElement('div'); b2.className = 'b2'; b2.textContent = b;
  d.append(b1, b2);
  if (c) { const b3 = document.createElement('div'); b3.className = 'b3'; b3.textContent = c; d.appendChild(b3); }
  host.appendChild(d);
}
const screens = ['#sTitle', '#sCash', '#sShop', '#sEnd', '#sSettings'];
function show(id) { for (const s of screens) $(s).hidden = s !== id; hideTip(); }
function showPlayUi(on) { $('#hud').hidden = !on; $('#rack').hidden = !on; if (!on) { $('#actBtn').hidden = true; $('#chooseHint').hidden = true; } }

/* ---------------- Déroulé ---------------- */
function newRound() {
  G.level = LEV.makeLevel(G.round, G.seed);
  G.taken = new Set(); G.fell = false; G.netUsed = false; G.roundCoins = 0; G.shown = G.money; G.combo = 0;
  buildGeometry(); placeBall(false); B.state = 'wait'; updateCam(0, true);
  parts.length = texts.length = rings.length = bursts.length = 0;
  G.mode = 'play'; G.paused = false; calibrate();
  show(null); showPlayUi(true);
  renderHud();
  const lv = G.level;
  if (lv.boss) { banner('Boss', lv.name, lv.rule, true); sfx.boss(); flash('#e2483d', .3, 700); addShake(geo.c * .2); }
  else banner('Manche ' + G.round, lv.name, lv.rule || '');
  setTimeout(() => { if (G.mode === 'play' && B.state === 'wait' && !G.choosing) promptChoose(); }, lv.boss || lv.rule ? 1300 : 700);
}
function startRun() {
  G.round = 1; G.money = 0; G.shown = 0; G.rack = Array(MAX_BALLS).fill('plain'); G.cur = 0; G.endless = false;
  G.earned = 0; G.won = 0; G.runId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  G.seed = (Math.random() * 4294967296) >>> 0;
  newRound();
}

let cashSkip = false;
async function showCash() {
  if (G.mode !== 'won') return;
  G.mode = 'cash'; showPlayUi(false); $('#hud').hidden = false;
  const lines = [['Trou doré', 3]];
  if (!G.fell) lines.push(['Sans chute', 2]);
  if (B.kind === 'piggy') lines.push(['Tirelire', 3]);
  if (G.level.boss) lines.push(['Boss vaincu', 5]);
  lines.push(['Intérêts · $1 par $5 gardés', Math.min(5, Math.floor(G.money / 5))]);
  const total = lines.reduce((s, l) => s + l[1], 0);
  const ul = $('#ledger'); ul.textContent = '';
  const btn = $('#bCash'); btn.disabled = true; btn.classList.remove('pulse'); btn.textContent = 'Encaisser';
  cashSkip = false;
  show('#sCash');
  await wait(380);
  const line = async (label, prefix, v, suffix, cls) => {
    const li = document.createElement('li'); if (cls) li.className = cls;
    const a = document.createElement('span'); a.textContent = label;
    const f = document.createElement('span'); f.className = 'fill';
    const b = document.createElement('b'); b.textContent = prefix + (cls ? v : 0) + suffix;
    li.append(a, f, b); ul.appendChild(li);
    if (cls) return;
    const steps = Math.min(v, 12);
    for (let i = 1; i <= steps; i++) {
      if (!cashSkip) await wait(55);
      b.textContent = prefix + Math.round(v * i / steps) + suffix; if (!cashSkip) sfx.tick(520 + i * 40);
    }
    if (!cashSkip) await wait(160);
  };
  await line('Pièces ramassées', '', G.roundCoins, ' / ' + geo.coins.length);
  for (const [label, v] of lines) await line(label, '+$', v, '');
  await line('Total', '$', total, '', 'total');
  sfx.win(); buzz(25);
  btn.textContent = 'Encaisser $' + total; btn.disabled = false; btn.classList.add('pulse');
  btn.onclick = () => {
    btn.onclick = null; G.money += total; G.earned += total; G.shown = G.money; sfx.buy();
    if (G.round === 8 && !G.endless) showEnd('win'); else openShop();
  };
}
$('#cashPanel').addEventListener('pointerdown', e => { if (e.target.id !== 'bCash') cashSkip = true; });

/* ---------------- Boutique ----------------
   La réserve ne dépasse jamais 10 billes : pour acheter quand elle est pleine, on retire d'abord une bille (revendue à moitié prix). */
const price = k => G.bossReward && k !== 'plain' ? 0 : BALLS[k].price;
const sellPrice = k => Math.max(1, Math.floor(BALLS[k].price / 2));
function openShop() {
  G.mode = 'shop'; showPlayUi(false); $('#hud').hidden = false;
  G.rerollCost = 2; G.bossReward = !!G.level.boss; G.swapFor = null; armed = -1;
  genOffers(); renderShop(true); show('#sShop'); renderHud();
  [0, 1, 2].forEach(i => setTimeout(sfx.deal, 140 + i * 110));
}
function genOffers() {
  const pool = POWER_KINDS.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  G.offers = pool.slice(0, 3); G.sold = new Set();
}
let armed = -1, armTimer = 0;
function renderShop(deal) {
  $('#shopMoney').textContent = '$' + G.money;
  const note = $('#shopNote');
  const full = G.rack.length >= MAX_BALLS;
  let txt = '';
  if (G.swapFor) txt = `Touche la bille à retirer pour faire de la place à ${BALLS[G.swapFor].name}. Elle est revendue à moitié prix. Touche à nouveau la carte pour annuler.`;
  else {
    if (G.bossReward) txt = 'Récompense du boss : une bille à pouvoir offerte. ';
    if (full) txt += 'Ta réserve est pleine (10 / 10) : pour acheter, tu devras retirer une bille.';
  }
  note.hidden = !txt; note.textContent = txt.trim();
  const box = $('#offers'); box.textContent = ''; tiltEls = [];
  G.offers.forEach((k, i) => {
    const pw = BALLS[k], b = document.createElement('button'); b.type = 'button'; b.className = 'offer'; b.dataset.k = k;
    b.style.setProperty('--i', i);
    if (!deal) b.style.animation = 'none';
    if (G.sold.has(k)) b.classList.add('sold');
    if (G.swapFor === k) b.classList.add('pending');
    if (G.money < price(k)) b.classList.add('poor');
    const tl = document.createElement('div'); tl.className = 'tilt';
    const card = document.createElement('div'); card.className = 'card'; card.style.setProperty('--i', i);
    const ball = ballCanvas(k, 12); ball.className = 'ball';
    card.appendChild(ball);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pw.name;
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = pw.desc;
    const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = G.sold.has(k) ? 'Achetée' : price(k) ? '$' + price(k) : 'Offerte';
    card.append(nm, ds, pr); tl.appendChild(card); b.appendChild(tl);
    b.addEventListener('click', () => buy(k, b));
    box.appendChild(b); tiltEls.push(tl);
  });
  const own = $('#ownedList'); own.textContent = '';
  own.classList.toggle('swap', !!G.swapFor);
  G.rack.forEach((k, i) => {
    const b = rackButton(k, i);
    if (i === armed) b.classList.add('armed');
    bindHold(b, k, () => G.swapFor ? swapOut(i) : sellTap(i));
    own.appendChild(b);
  });
  $('#rackLab').textContent = `Tes billes · ${G.rack.length} / ${MAX_BALLS}`;
  const plain = $('#bPlain'); plain.disabled = G.money < BALLS.plain.price || full;
  const rr = $('#bReroll'); rr.textContent = 'Relancer $' + G.rerollCost; rr.disabled = G.money < G.rerollCost;
}
function removeBall(i) {
  const k = G.rack.splice(i, 1)[0];
  G.money += sellPrice(k); G.shown = G.money; G.cur = clamp(G.cur, 0, Math.max(0, G.rack.length - 1));
  return k;
}
function sellTap(i) {
  if (armed !== i) {
    armed = i; clearTimeout(armTimer); armTimer = setTimeout(() => { armed = -1; if (G.mode === 'shop') renderShop(false); }, 2500);
    toast(`Touche encore pour revendre ${BALLS[G.rack[i]].name} (+$${sellPrice(G.rack[i])}).`);
    renderShop(false); return;
  }
  if (G.rack.length <= 1) { toast('Garde au moins une bille.'); sfx.no(); return; }
  armed = -1; clearTimeout(armTimer);
  const k = removeBall(i);
  toast(`${BALLS[k].name} revendue : +$${sellPrice(k)}.`); sfx.buy();
  renderShop(false); renderHud();
}
function swapOut(i) {
  const want = G.swapFor; G.swapFor = null;
  const k = removeBall(i);
  sfx.tick(330);
  completeBuy(want, document.querySelector(`#offers .offer[data-k="${want}"]`), `${BALLS[k].name} retirée (+$${sellPrice(k)}). `);
}
function bumpEl(el) { if (REDUCED) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function buy(k, el) {
  if (G.sold.has(k)) return;
  const refuse = msg => { toast(msg); sfx.no(); if (el) { el.style.animation = ''; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); } };
  if (G.swapFor === k) { G.swapFor = null; toast('Achat annulé.'); renderShop(false); return; }
  if (G.money < price(k)) return refuse('Il te manque $' + (price(k) - G.money) + '.');
  if (G.rack.length >= MAX_BALLS) {
    if (k === 'plain') return refuse('Ta réserve est pleine (10 billes).');
    G.swapFor = k; sfx.tick(520); renderShop(false);
    toast('Réserve pleine : touche la bille à retirer.');
    return;
  }
  completeBuy(k, el, '');
}
function completeBuy(k, el, prefix) {
  const cost = price(k);
  G.money -= cost; G.shown = G.money; G.rack.push(k); sfx.buy(); buzz(15);
  if (k !== 'plain') { G.sold.add(k); if (G.bossReward && cost === 0) G.bossReward = false; }
  if (el) { el.style.animation = ''; el.classList.add('bought'); }
  bumpEl($('#shopMoney')); $('#shopMoney').textContent = '$' + G.money;
  toast(prefix + (k === 'plain' ? 'Une bille simple de plus.' : `${BALLS[k].name} ajoutée. Choisis-la au prochain lancer.`));
  setTimeout(() => { if (G.mode === 'shop') renderShop(false); renderHud(); }, el ? 380 : 0);
}

/* ---------------- Fin de partie & classement ----------------
   Score = 100 par manche gagnée + tout l'argent gagné pendant la partie (dépensé ou non).
   Classement partagé via /api/bille-scores ; s'il ne répond pas, on garde un top 10 sur le téléphone. */
const SCORE_API = '/api/bille-scores';
const score = () => G.won * 100 + G.earned;
const esc = s => String(s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
function localScores() { try { return JSON.parse(localStorage.getItem('bf.scores') || '[]'); } catch (e) { return []; } }
function saveLocal(entry) {
  const list = localScores().filter(e => e.run !== entry.run);
  list.push(entry); list.sort((a, b) => b.score - a.score);
  try { localStorage.setItem('bf.scores', JSON.stringify(list.slice(0, 20))); } catch (e) {}
}
async function api(method, body, run) {
  try {
    const r = await fetch(SCORE_API + (run ? '?run=' + encodeURIComponent(run) : ''), {
      method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
function renderBoard(data, online, myRun) {
  $('#boardSrc').textContent = online ? 'En ligne' : 'Sur ce téléphone';
  const ol = $('#board'); ol.textContent = '';
  const top = (data && data.top) || [];
  if (!top.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Aucun score pour l’instant. Sois le premier !'; ol.appendChild(li); return; }
  const row = (e, cls, rank) => {
    const li = document.createElement('li'); if (cls) li.className = cls; if (rank) li.dataset.rank = rank;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = e.name || 'Anonyme';
    const s = document.createElement('span'); s.className = 's'; s.textContent = e.score;
    const r = document.createElement('span'); r.className = 'r'; r.textContent = 'M' + e.round;
    li.append(n, s, r); ol.appendChild(li);
  };
  top.slice(0, 10).forEach(e => row(e, e.run === myRun ? 'me' : ''));
  if (myRun && data.rank && data.rank > 10 && data.me) row(data.me, 'me extra', data.rank);
}
async function loadBoard(myRun) {
  $('#boardSrc').textContent = '…';
  const data = await api('GET', null, myRun);
  if (data && data.top) { renderBoard(data, true, myRun); return; }
  const list = localScores(), idx = list.findIndex(e => e.run === myRun);
  renderBoard({ top: list.slice(0, 10), rank: idx >= 0 ? idx + 1 : null, me: list[idx] }, false, myRun);
}
let endKind = 'over';
function showEnd(kind) {
  endKind = kind;
  G.mode = kind === 'view' ? G.mode : kind;
  if (kind !== 'view') { showPlayUi(false); if (G.round > G.best) { G.best = G.round; try { localStorage.setItem('bf.best', G.best); } catch (e) {} } }
  const view = kind === 'view';
  $('#endTitle').textContent = view ? 'Meilleurs scores' : kind === 'win' ? 'Partie gagnée !' : 'Plus de billes';
  $('#endTitle').className = 'ptitle ' + (kind === 'win' ? 'gold' : kind === 'over' ? 'red' : '');
  $('#endText').hidden = view;
  $('#endText').textContent = kind === 'win'
    ? `Les 8 manches sont gagnées, avec ${G.rack.length} bille${G.rack.length > 1 ? 's' : ''} en réserve. Tu peux continuer : les manches deviennent de plus en plus dures.`
    : `Ta dernière bille est tombée à la manche ${G.round}.`;
  $('#endScoreLine').hidden = view; $('#scoreForm').hidden = view;
  $('#endScore').textContent = score();
  $('#endDetail').textContent = `${G.won} manche${G.won > 1 ? 's' : ''} × 100 + $${G.earned} gagnés`;
  try { $('#playerName').value = localStorage.getItem('bf.name') || ''; } catch (e) {}
  const save = $('#bSave'); save.disabled = false; save.textContent = 'Enregistrer';
  $('#bRetry').textContent = view ? 'Jouer' : 'Rejouer';
  $('#bEndMenu').textContent = view ? 'Retour' : 'Menu';
  $('#bEndless').hidden = kind !== 'win';
  show('#sEnd');
  if (kind === 'win') { flash('#f2b544', .4, 800); sfx.win(); }
  loadBoard(view ? null : G.runId);
}
$('#scoreForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = esc($('#playerName').value) || 'Anonyme';
  try { localStorage.setItem('bf.name', name); } catch (er) {}
  const entry = { run: G.runId, name, score: score(), round: G.round, won: G.won };
  const save = $('#bSave'); save.disabled = true; save.textContent = '…';
  saveLocal({ ...entry, at: Date.now() });
  const res = await api('POST', entry);
  save.textContent = 'Enregistré';
  if (res && res.top) { renderBoard(res, true, G.runId); toast(res.rank ? `Tu es ${res.rank === 1 ? '1er' : res.rank + 'e'} du classement.` : 'Score enregistré.'); }
  else { await loadBoard(G.runId); toast('Classement en ligne indisponible : score gardé sur ce téléphone.'); }
  sfx.buy();
});

/* ---------------- Pause & réglages ---------------- */
function openSettings() {
  if (G.mode === 'play') G.paused = true;
  anchorHeld = false;
  syncSettings(); updateSensorInfo(); show('#sSettings');
}
function syncSettings() {
  const f = v => (+v).toFixed(1).replace('.', ',');
  [['rSens', 'oSens', 'sens', f], ['rRelief', 'oRelief', 'relief', f], ['rPersp', 'oPersp', 'persp', f], ['rFric', 'oFric', 'fric', f], ['rJump', 'oJump', 'jump', v => v + ' m/s²'], ['rShake', 'oShake', 'shake', f]]
    .forEach(([r, o, k, fmt]) => { $('#' + r).value = S[k]; $('#' + o).textContent = fmt(S[k]); });
  $('#selPix').value = S.pix;
  $('#ctrlLabel').textContent = CTRL_NAMES[ctrl];
  $('#bSound').textContent = 'Son : ' + (S.sound ? 'oui' : 'non');
}
[['rSens', 'sens'], ['rRelief', 'relief'], ['rPersp', 'persp'], ['rFric', 'fric'], ['rJump', 'jump'], ['rShake', 'shake']].forEach(([id, k]) => {
  $('#' + id).addEventListener('input', e => { S[k] = +e.target.value; if (k === 'shake') { S.shakeSet = true; addShake(geo.c * .3); } saveS(); syncSettings(); });
});
$('#selPix').addEventListener('change', e => { S.pix = e.target.value; saveS(); layout(); });
function toggleSound() {
  S.sound = !S.sound; saveS(); initAudio();
  if (master) master.gain.value = S.sound ? .8 : 0;
  syncSettings();
}

async function begin(fn) {
  const perm = enableSensors();                  // doit partir dans le geste (iOS)
  SENS.started = true; SENS.since = now(); SENS.warned = false;
  initAudio(); sfx.tick();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
  await perm;
  updateSensorStatus();
  fn();
}
$('#bPlay').addEventListener('click', () => begin(startRun));
$('#bRetry').addEventListener('click', () => begin(startRun));
$('#bNext').addEventListener('click', () => { sfx.tick(); armed = -1; G.round++; newRound(); });
$('#bEndless').addEventListener('click', () => { G.endless = true; openShop(); });
$('#bEndMenu').addEventListener('click', () => { if (endKind === 'view') show('#sTitle'); else $('#bQuit').click(); });
$('#bScores').addEventListener('click', () => { sfx.tick(); showEnd('view'); });
$('#bPlain').addEventListener('click', () => buy('plain', null));
$('#bReroll').addEventListener('click', () => {
  if (G.money < G.rerollCost) return;
  G.money -= G.rerollCost; G.shown = G.money; G.rerollCost++; genOffers(); sfx.tick();
  renderShop(true); renderHud(); bumpEl($('#shopMoney'));
  [0, 1, 2].forEach(i => setTimeout(sfx.deal, 140 + i * 110));
});
$('#bSettings').appendChild(bmpCanvas(PAUSE_BMP, 3));
$('#bSettings').addEventListener('click', () => { sfx.tick(); openSettings(); });
$('#bSound').addEventListener('click', toggleSound);
$('#bResume').addEventListener('click', () => {
  sfx.tick();
  const back = { play: null, shop: '#sShop', title: '#sTitle', over: '#sEnd', cash: '#sCash', win: '#sEnd' }[G.mode];
  if (G.mode === 'play') G.paused = false;
  show(back || null);
});
$('#bQuit').addEventListener('click', () => {
  G.mode = 'title'; G.paused = false; G.choosing = false; G.level = LEV.HAND[0]; G.taken = new Set(); B.kind = 'plain';
  buildGeometry(); placeBall(false); updateCam(0, true);
  showPlayUi(false); show('#sTitle'); updateSensorStatus();
});
$('#bCalib').addEventListener('click', () => { calibrate(); toast(ctrl === 'sensor' ? 'Horizon recalé sur la position actuelle.' : 'Pas de capteurs actifs : rien à recaler.'); });
$('#tMoney').addEventListener('click', () => { G.money += 10; G.shown = G.money; renderMoney(true); if (G.mode === 'shop') renderShop(false); });
$('#tUnlock').addEventListener('click', () => {
  G.rack = ['plain', ...POWER_KINDS].slice(0, MAX_BALLS); G.cur = 0; renderHud();
  if (G.mode === 'play') { renderRack(); toast('Une bille de chaque dans ta réserve.'); }
  if (G.mode === 'shop') renderShop(false);
});
$('#tSkip').addEventListener('click', () => {
  if (G.mode !== 'play') return;
  G.paused = false; G.choosing = false; show(null);
  const h = geo.holes.find(q => q.goal); B.x = h.x; B.y = h.y; B.hz = 0; B.onGround = true; B.state = 'roll'; startSink(h);
});

document.addEventListener('visibilitychange', () => {
  if (AC) { if (document.hidden) AC.suspend && AC.suspend(); else AC.resume && AC.resume(); }
  if (document.hidden && G.mode === 'play' && !G.paused) openSettings();
});
addEventListener('resize', layout);

/* ---------------- Pilote automatique (tests, #debug) ---------------- */
function botTilt(dt) {
  const g = geo, c = g.c;
  const cx = clamp(Math.floor(B.x / g.cw), 0, g.C - 1), cy = clamp(Math.floor(B.y / g.ch), 0, g.R - 1), key = cx + ',' + cy;
  BOT.t -= dt;
  if (!BOT.path || BOT.t <= 0 || BOT.cell !== key) { BOT.path = LEV.pathFor(G.level, [cx, cy]); BOT.t = .3; BOT.cell = key; }
  if (!BOT.path) return { x: 0, y: 0 };
  const n = BOT.path[Math.min(1, BOT.path.length - 1)];
  const tx = (n[0] + .5) * g.cw, ty = (n[1] + .5) * g.ch;
  const ax = 36 * (tx - B.x) - 12 * B.vx, ay = 36 * (ty - B.y) - 12 * B.vy, k = 28 * c * S.sens;
  return { x: clamp(ax / k, -.8, .8), y: clamp(ay / k, -.8, .8) };
}
if (DEBUG) window.__bf = {
  G, B, S, SENS, LEV, BALLS, get geo() { return geo; }, get cam() { return cam; },
  start(round, rack) {
    initAudio(); G.round = round; G.money = 0; G.shown = 0; G.seed = G.seed || 1; G.rack = rack || Array(MAX_BALLS).fill('plain'); G.cur = 0;
    newRound();
  },
  launchNow(i = 0) { launch(i); },
  bot(on) { BOT.on = on; BOT.path = null; },
  sim(seconds, fps = 60) { const dt = 1 / fps; let t = 0; for (let i = 0; i < seconds * fps; i++) { t += dt; tick(dt, t); if (G.mode !== 'play') break; } return { mode: G.mode, rack: G.rack.length, x: B.x, y: B.y }; },
  render(time = 1) { render(time); },
};

/* ---------------- Démarrage ---------------- */
document.querySelectorAll('.title > span').forEach(s => letters(s, s.textContent));
updateSensorStatus();
G.level = LEV.HAND[0]; layout(); placeBall(false);
requestAnimationFrame(t => { last = t; frame(t); });
})();
