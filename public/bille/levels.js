/* Niveaux de Bille Foraine : cartes dessinées à la main et générateur avec chemin garanti.

   Objets (calque « map ») :
     #  mur haut          =  mur bas (se saute)     o  piège          G  trou doré
     $  pièce             *  grosse pièce ($5)      b  bumper         S  départ
     1-4  téléporteurs (chaque chiffre apparaît deux fois, les deux se renvoient la bille)
     .  vide
   Sol (calque « floor ») :
     i  glace             g  colle                  .  normal

   Un niveau : { name, map[], floor[]|null, scroll, boss, rule, movers[], C, R }
   « scroll » : monde plus grand que l'écran, la caméra suit la bille.
   « movers » : pièges qui se promènent { x, y, axis:'x'|'y', amp (cases), w (rad/s), ph }. */
(function (root) {
'use strict';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashSeed(a, b) {
  let h = 2166136261 ^ a;
  h = Math.imul(h ^ b, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}

/* ---------------- Niveaux dessinés à la main (9 × 16) ---------------- */
const HAND = [
  { name: 'Le Couloir', map: [
    '.........', '.........', '....G....', '.........', '###...###', '.$.....$.', '...o.o...', '.........',
    '###.$.###', '.........', '.$..o..$.', '.........', '..##.##..', '.$.....$.', '....S....', '.........' ] },
  { name: 'Les Chicanes', map: [
    '.........', 'G........', '.........', '######...', '.......$.', '...o.....', '...######', '.$.......',
    '.....o...', '######...', '.......$.', '...o.....', '...######', '.$.......', '.......S.', '.........' ] },
  { name: 'Le Gruyère', map: [
    '.........', '.o..G..o.', '.........', 'o.$.o.$.o', '.........', '..o...o..', '$...#...$', '..o.#.o..',
    '.........', 'o.$.o.$.o', '.........', '..o...o..', '.........', '.o.$.$.o.', '....S....', '.........' ] },
  { name: 'Le Dédale', map: [
    '.........', 'G..#.....', '...#.##$.', '.o.#..#..', '...##.#.o', '##....#..', '.$.#..###', '...#.....',
    '.###.###.', '...$..#..', '.#####..o', '.o...#.#$', '.....#.#.', '####.###.', 'S......$.', '.........' ] },
].map(l => ({ scroll: false, floor: null, boss: null, rule: '', movers: [], C: 9, R: 16, ...l }));

const BOSSES = {
  verglas: { name: 'Le Grand Verglas', rule: 'Sol glissant : la bille ne s’arrête plus' },
  rodeurs: { name: 'Les Rôdeurs', rule: 'Des trous se promènent' },
};
const NAMES_CLASSIC = ['La Roulotte', 'Le Carrousel', 'La Grande Roue', 'Le Tir aux Pigeons', 'Le Palais des Glaces',
  'Les Autos Tamponneuses', 'Le Train Fantôme', 'La Pêche aux Canards', 'Le Manège', 'La Confiserie'];
const NAMES_OPEN = ['Le Grand Huit', 'La Foire Entière', 'Le Grand Marché', 'Les Allées', 'La Fête Foraine'];

const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const isPortal = ch => ch >= '1' && ch <= '4';
const isBlockCh = ch => ch === '#' || ch === '=' || ch === 'o' || ch === 'b' || isPortal(ch);

/* Cases infranchissables sans sauter ni être aspiré : murs, pièges, bumpers, téléporteurs, trajet des trous mobiles. */
function blockedGrid(lv) {
  const R = lv.map.length, C = lv.map[0].length;
  const bl = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => isBlockCh(lv.map[y][x])));
  for (const m of lv.movers || []) {
    for (let k = -m.amp; k <= m.amp; k++) {
      const x = m.axis === 'x' ? m.x + k : m.x, y = m.axis === 'y' ? m.y + k : m.y;
      if (x >= 0 && y >= 0 && x < C && y < R) bl[y][x] = true;
    }
  }
  return bl;
}
function findCell(lv, ch) {
  for (let y = 0; y < lv.map.length; y++) { const x = lv.map[y].indexOf(ch); if (x >= 0) return [x, y]; }
  return null;
}
/* Plus court chemin (cases) de `from` (par défaut le départ) jusqu'au trou doré, ou null. */
function pathFor(lv, from) {
  const bl = blockedGrid(lv), R = bl.length, C = bl[0].length;
  const s = from || findCell(lv, 'S'), g = findCell(lv, 'G');
  if (!s || !g) return null;
  const prev = Array.from({ length: R }, () => Array(C).fill(null));
  const seen = Array.from({ length: R }, () => Array(C).fill(false));
  const q = [s]; seen[s[1]][s[0]] = true;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (x === g[0] && y === g[1]) {
      const out = [[x, y]];
      let p = prev[y][x];
      while (p) { out.push(p); p = prev[p[1]][p[0]]; }
      return out.reverse();
    }
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R || seen[ny][nx]) continue;
      if (bl[ny][nx] && !(nx === s[0] && ny === s[1])) continue;
      seen[ny][nx] = true; prev[ny][nx] = [x, y]; q.push([nx, ny]);
    }
  }
  return null;
}

/* ---------------- Générateur ---------------- */
function gen(o, rng) {
  const { C, R, scroll } = o;
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const chance = p => rng() < p;
  const map = Array.from({ length: R }, () => Array(C).fill('.'));
  const fl = Array.from({ length: R }, () => Array(C).fill(o.allIce ? 'i' : '.'));
  const res = Array.from({ length: R }, () => Array(C).fill(false));
  const movers = [];
  const sx = ri(2, C - 3), sy = R - 2;
  const gx = ri(1, C - 2), gy = scroll ? 1 : 2;
  map[sy][sx] = 'S'; map[gy][gx] = 'G';

  const near = (x, y, cx, cy, d) => Math.abs(x - cx) <= d && Math.abs(y - cy) <= d;
  const protectedCell = (x, y) => near(x, y, sx, sy, 1) || near(x, y, gx, gy, 1);
  const free = (x, y) => x >= 0 && y >= 1 && x < C && y < R - 1 && map[y][x] === '.' && !res[y][x] && !protectedCell(x, y);
  const isBlk = (x, y) => res[y][x] || isBlockCh(map[y][x]);
  const adj4 = (x, y, ch) => D4.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < C && ny < R && map[ny][nx] === ch; });
  function reach() {
    const vis = Array.from({ length: R }, () => Array(C).fill(false));
    const q = [[sx, sy]]; vis[sy][sx] = true;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= C || ny >= R || vis[ny][nx] || isBlk(nx, ny)) continue;
        vis[ny][nx] = true; q.push([nx, ny]);
      }
    }
    return vis;
  }
  const ok = () => reach()[gy][gx];
  function tryPlace(cells, ch) {
    for (const [x, y] of cells) if (!free(x, y)) return false;
    for (const [x, y] of cells) map[y][x] = ch;
    if (ok()) return true;
    for (const [x, y] of cells) map[y][x] = '.';
    return false;
  }
  function scatter(ch, n, extra) {
    for (let placed = 0, tries = 0; placed < n && tries < n * 40 + 20; tries++) {
      const x = ri(0, C - 1), y = ri(1, R - 2);
      if (extra && !extra(x, y)) continue;
      if (tryPlace([[x, y]], ch)) placed++;
    }
  }
  function run(ch, n, minLen, maxLen) {
    for (let placed = 0, tries = 0; placed < n && tries < n * 30 + 20; tries++) {
      const len = ri(minLen, maxLen), horiz = chance(.7), cells = [];
      const x = horiz ? ri(0, C - len) : ri(0, C - 1), y = horiz ? ri(1, R - 2) : ri(1, R - 1 - len);
      for (let k = 0; k < len; k++) cells.push(horiz ? [x + k, y] : [x, y + k]);
      if (tryPlace(cells, ch)) placed++;
    }
  }

  // murs hauts : barres collées à un bord (chicanes) ou isolées
  for (let placed = 0, tries = 0; placed < o.walls && tries < o.walls * 14 + 20; tries++) {
    const horiz = chance(.72), cells = [];
    if (horiz) {
      const len = ri(2, scroll ? 6 : 5), y = ri(2, R - 3);
      const x = chance(.4) ? (chance(.5) ? 0 : C - len) : ri(0, C - len);
      for (let k = 0; k < len; k++) cells.push([x + k, y]);
    } else {
      const len = ri(2, 4), x = ri(1, C - 2), y = ri(1, R - 1 - len);
      for (let k = 0; k < len; k++) cells.push([x, y + k]);
    }
    if (tryPlace(cells, '#')) placed++;
  }
  scatter('o', o.traps, (x, y) => !near(x, y, sx, sy, 2) && !adj4(x, y, 'o'));
  scatter('b', o.bumpers, (x, y) => !near(x, y, sx, sy, 2));
  run('=', o.low, 2, 3);

  // coffres : une grosse pièce entourée de murs bas, il faut sauter pour l'attraper
  for (let n = 0, tries = 0; n < o.chests && tries < 60; tries++) {
    const cx = ri(1, C - 2), cy = ri(2, R - 3), ring = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ring.push([cx + dx, cy + dy]);
    if (!free(cx, cy)) continue;
    if (tryPlace(ring, '=')) { map[cy][cx] = '*'; n++; }
  }

  // téléporteurs : deux cases éloignées, avec le même chiffre
  for (let k = 1; k <= o.portals; k++) {
    const ch = String(k);
    for (let tries = 0, done = false; !done && tries < 80; tries++) {
      const x1 = ri(0, C - 1), y1 = ri(2, R - 3), x2 = ri(0, C - 1), y2 = ri(2, R - 3);
      if (Math.abs(x1 - x2) + Math.abs(y1 - y2) < Math.max(7, C)) continue;
      if (!tryPlace([[x1, y1]], ch)) continue;
      if (tryPlace([[x2, y2]], ch)) done = true; else map[y1][x1] = '.';
    }
  }

  // pièges qui se promènent : leur trajet est réservé et ne doit pas fermer le chemin
  for (let n = 0, tries = 0; n < o.movers && tries < 80; tries++) {
    const axis = chance(.55) ? 'x' : 'y', amp = ri(1, 2);
    const x = axis === 'x' ? ri(amp, C - 1 - amp) : ri(0, C - 1), y = axis === 'y' ? ri(1 + amp, R - 2 - amp) : ri(1, R - 2);
    if (near(x, y, sx, sy, 3)) continue;
    const cells = [];
    for (let k = -amp; k <= amp; k++) cells.push(axis === 'x' ? [x + k, y] : [x, y + k]);
    if (!cells.every(([cx, cy]) => free(cx, cy))) continue;
    for (const [cx, cy] of cells) res[cy][cx] = true;
    if (ok()) { movers.push({ x, y, axis, amp, w: +(0.7 + rng() * 0.5).toFixed(2), ph: +(rng() * 6.28).toFixed(2) }); n++; }
    else for (const [cx, cy] of cells) res[cy][cx] = false;
  }

  // plaques de glace et de colle
  function patch(ch, n) {
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const w = ri(2, 4), h = ri(2, 5), x = ri(0, C - w), y = ri(1, R - 1 - h);
      let bad = false;
      for (let yy = y; yy < y + h && !bad; yy++) for (let xx = x; xx < x + w; xx++) if (protectedCell(xx, yy) || fl[yy][xx] !== '.') { bad = true; break; }
      if (bad) continue;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) fl[yy][xx] = ch;
      i++;
    }
  }
  if (!o.allIce) patch('i', o.ice);
  patch('g', o.glue);

  // pièces : cases atteignables, espacées, quelques-unes tout près d'un piège
  const vis = reach(), cand = [], risky = [];
  for (let y = 1; y < R - 1; y++) for (let x = 0; x < C; x++) {
    if (!vis[y][x] || map[y][x] !== '.' || res[y][x] || near(x, y, sx, sy, 1)) continue;
    cand.push([x, y]);
    if (adj4(x, y, 'o') || adj4(x, y, 'b')) risky.push([x, y]);
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  shuffle(cand); shuffle(risky);
  const coins = [];
  const spaced = (x, y, d) => coins.every(([cx, cy]) => !near(x, y, cx, cy, d));
  for (const [x, y] of risky) { if (coins.length >= Math.ceil(o.coins / 3)) break; if (spaced(x, y, 1)) coins.push([x, y]); }
  for (const d of [2, 1, 0]) for (const [x, y] of cand) { if (coins.length >= o.coins) break; if (spaced(x, y, d)) coins.push([x, y]); }
  for (const [x, y] of coins) map[y][x] = '$';

  return { map: map.map(r => r.join('')), floor: fl.some(r => r.some(c => c !== '.')) ? fl.map(r => r.join('')) : null, movers, C, R, scroll };
}

function params(kind, round, boss) {
  const d = Math.min(1.8, (round - 1) / 7), extra = Math.max(0, round - 8);
  if (kind === 'classic') return { C: 9, R: 16, scroll: false, walls: 5 + Math.round(d * 3), traps: 4 + Math.round(d * 4), bumpers: Math.round(d * 2.6),
    low: d >= .5 ? 2 : 0, chests: d >= .5 ? 1 : 0, portals: d >= .5 ? (d > 1.2 ? 2 : 1) : 0, ice: d >= .3 ? 1 + (d > 1 ? 1 : 0) : 0, glue: d >= .8 ? 1 : 0,
    coins: 7 + Math.round(d * 2), movers: 0 };
  if (kind === 'open') return { C: 10 + Math.min(4, Math.floor(round / 2)), R: 22 + Math.min(10, Math.round(round * 1.2)), scroll: true,
    walls: 10 + Math.round(d * 6), traps: 7 + Math.round(d * 6), bumpers: 2 + Math.round(d * 2), low: 2 + Math.round(d * 2), chests: 1 + (d > 1 ? 1 : 0),
    portals: round >= 6 ? 1 : 0, ice: 1 + (d > .6 ? 1 : 0), glue: d > .6 ? 1 : 0, coins: 12 + Math.round(d * 5), movers: 0 };
  if (boss === 'verglas') return { C: 11, R: 28, scroll: true, allIce: true, walls: 16, traps: 8 + Math.min(4, extra), bumpers: 5, low: 2, chests: 1,
    portals: 0, ice: 0, glue: 0, coins: 14, movers: 0 };
  return { C: 12, R: 30, scroll: true, walls: 14, traps: 6 + Math.min(4, extra), bumpers: 3, low: 2, chests: 1, portals: 1, ice: 1, glue: 0,
    coins: 16, movers: 6 + Math.min(3, extra) };
}

function planFor(round, rng) {
  if (round % 4 === 0) return { kind: 'boss', boss: (round / 4) % 2 === 1 ? 'verglas' : 'rodeurs' };
  if (round === 1) return { kind: 'hand', i: 0 };
  if (round === 2) return { kind: 'hand', i: 1 };
  if (round === 7) return { kind: 'hand', i: 3 };
  if (round === 3 || round === 6) return { kind: 'open' };
  if (round === 5) return { kind: 'classic' };
  const r = rng();
  if (r < .2) return { kind: 'hand', i: 1 + Math.floor(rng() * 3) };
  return { kind: r < .6 ? 'open' : 'classic' };
}

function valid(lv, o) {
  if (!pathFor(lv)) return false;
  const nCoins = lv.map.join('').split('').filter(c => c === '$').length;
  return nCoins >= Math.max(4, Math.floor(o.coins * .6));
}

const isBoss = round => round % 4 === 0;

function makeLevel(round, runSeed) {
  const rng = mulberry32(hashSeed(runSeed >>> 0, round));
  const p = planFor(round, rng);
  if (p.kind === 'hand') return { ...HAND[p.i], round };
  for (let attempt = 0; attempt < 30; attempt++) {
    const o = params(p.kind, round, p.boss);
    const lv = gen(o, rng);
    if (!valid(lv, o)) continue;
    if (p.kind === 'boss') return { ...lv, round, name: BOSSES[p.boss].name, boss: p.boss, rule: BOSSES[p.boss].rule };
    const name = p.kind === 'open'
      ? (round === 3 ? 'Le Grand Large' : round === 6 ? 'La Traversée' : NAMES_OPEN[Math.floor(rng() * NAMES_OPEN.length)])
      : NAMES_CLASSIC[Math.floor(rng() * NAMES_CLASSIC.length)];
    return { ...lv, round, name, boss: null, rule: p.kind === 'open' ? 'Monde ouvert : le décor défile autour de la bille' : '' };
  }
  return { ...HAND[0], round };
}

const API = { makeLevel, pathFor, blockedGrid, findCell, planFor, isBoss, BOSSES, HAND, mulberry32, hashSeed };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.BFLevels = API;
})(typeof window !== 'undefined' ? window : globalThis);
