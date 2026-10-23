/* Coquille — worker de lecture PaddleOCR (PP-OCRv6 small, Apache 2.0) sur ONNX Runtime Web (MIT).
   Reçoit une image (RGBA), détecte les lignes de texte puis les lit. Tout reste dans le navigateur. */
"use strict";
importScripts("../ort/ort.wasm.min.js");

const BASE = self.location.href.replace(/[^/]*$/, "");
let det = null, rec = null, chars = null;
const DET_MAX = 512;          // côté max de l'image envoyée à la détection
const DB_THRESH = 0.2, BOX_THRESH = 0.45, UNCLIP = 1.4;
let cache = [];               // lignes lues sur l'image précédente (réutilisées si identiques)

async function init(threads) {
  ort.env.wasm.wasmPaths = new URL("../ort/", BASE).href;
  ort.env.wasm.numThreads = threads || 1;
  const opts = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
  const [d, r, dict] = await Promise.all([
    ort.InferenceSession.create(new URL("det.onnx", BASE).href, opts),
    ort.InferenceSession.create(new URL("rec.onnx", BASE).href, opts),
    fetch(new URL("dict.txt", BASE)).then((x) => x.text())
  ]);
  det = d; rec = r;
  const lines = dict.split("\n").map((l) => l.replace(/\r$/, ""));
  if (lines[lines.length - 1] === "") lines.pop();
  chars = ["", ...lines, " "]; // 0 = blank (CTC), puis le dictionnaire, puis l'espace
}

/* ---------- Détection (DBNet) ---------- */
async function detect(rgba, w, h) {
  const s = Math.min(1, DET_MAX / Math.max(w, h));
  const rw = Math.max(32, Math.round((w * s) / 32) * 32), rh = Math.max(32, Math.round((h * s) / 32) * 32);
  const sx = w / rw, sy = h / rh;
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225]; // appliqués en ordre B, G, R
  const input = new Float32Array(3 * rw * rh), plane = rw * rh;
  for (let y = 0; y < rh; y++) {
    const yy = Math.min(h - 1, Math.floor((y + 0.5) * sy));
    for (let x = 0; x < rw; x++) {
      const xx = Math.min(w - 1, Math.floor((x + 0.5) * sx)), o = (yy * w + xx) * 4, i = y * rw + x;
      input[i] = (rgba[o + 2] / 255 - mean[0]) / std[0];
      input[plane + i] = (rgba[o + 1] / 255 - mean[1]) / std[1];
      input[2 * plane + i] = (rgba[o] / 255 - mean[2]) / std[2];
    }
  }
  const out = await det.run({ [det.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, rh, rw]) });
  const prob = out[det.outputNames[0]].data;
  // composantes connexes de la carte binarisée
  const lab = new Int32Array(plane), boxes = [];
  const stack = [];
  for (let i = 0; i < plane; i++) {
    if (lab[i] || prob[i] <= DB_THRESH) continue;
    const id = boxes.length + 1; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, sum = 0, n = 0;
    stack.push(i); lab[i] = id;
    while (stack.length) {
      const p = stack.pop(), px = p % rw, py = (p - px) / rw;
      sum += prob[p]; n++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      const nb = [px > 0 ? p - 1 : -1, px < rw - 1 ? p + 1 : -1, py > 0 ? p - rw : -1, py < rh - 1 ? p + rw : -1];
      for (const q of nb) if (q >= 0 && !lab[q] && prob[q] > DB_THRESH) { lab[q] = id; stack.push(q); }
    }
    boxes.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, score: sum / n, n });
  }
  const res = [];
  for (const b of boxes) {
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
    if (Math.min(bw, bh) < 3 || b.score < BOX_THRESH) continue;
    const d = (bw * bh * UNCLIP) / (2 * (bw + bh)); // « unclip » de DBNet sur un rectangle
    const x0 = Math.max(0, (b.x0 - d) * sx), y0 = Math.max(0, (b.y0 - d) * sy);
    const x1 = Math.min(w, (b.x1 + d) * sx), y1 = Math.min(h, (b.y1 + d) * sy);
    if (Math.min(x1 - x0, y1 - y0) < 5) continue;
    res.push({ x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1), score: b.score });
  }
  return res;
}

/* ---------- Reconnaissance (CTC) ---------- */
function cropSig(rgba, w, b) { // petite empreinte en niveaux de gris (16×4) pour reconnaître une ligne déjà lue
  const sig = new Float32Array(64), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 16; i++) {
    const x = Math.min(b.x1 - 1, b.x0 + Math.floor((i + 0.5) * bw / 16)), y = Math.min(b.y1 - 1, b.y0 + Math.floor((j + 0.5) * bh / 4));
    const o = (y * w + x) * 4; sig[j * 16 + i] = (rgba[o] * 77 + rgba[o + 1] * 150 + rgba[o + 2] * 29) >> 8;
  }
  return sig;
}
async function recognize(rgba, w, b) {
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0, H = 48;
  const W = Math.max(1, Math.ceil((H * bw) / bh)), Wp = Math.max(W, 320);
  const input = new Float32Array(3 * H * Wp), plane = H * Wp; // remplissage à 0 (= gris moyen une fois normalisé)
  for (let y = 0; y < H; y++) {
    const fy = b.y0 + ((y + 0.5) * bh) / H - 0.5;
    for (let x = 0; x < W; x++) {
      const fx = b.x0 + ((x + 0.5) * bw) / W - 0.5;
      // bilinéaire
      const x0 = Math.max(b.x0, Math.floor(fx)), y0 = Math.max(b.y0, Math.floor(fy));
      const x1 = Math.min(b.x1 - 1, x0 + 1), y1 = Math.min(b.y1 - 1, y0 + 1), ax = Math.min(1, Math.max(0, fx - x0)), ay = Math.min(1, Math.max(0, fy - y0));
      const o00 = (y0 * w + x0) * 4, o01 = (y0 * w + x1) * 4, o10 = (y1 * w + x0) * 4, o11 = (y1 * w + x1) * 4, i = y * Wp + x;
      for (let c = 0; c < 3; c++) { // ordre B, G, R comme OpenCV
        const ch = 2 - c;
        const v = (rgba[o00 + ch] * (1 - ax) + rgba[o01 + ch] * ax) * (1 - ay) + (rgba[o10 + ch] * (1 - ax) + rgba[o11 + ch] * ax) * ay;
        input[c * plane + i] = (v / 255 - 0.5) / 0.5;
      }
    }
  }
  const out = await rec.run({ [rec.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, H, Wp]) });
  const t = out[rec.outputNames[0]], [, T, C] = t.dims, p = t.data;
  let text = "", confs = [], prev = -1;
  for (let k = 0; k < T; k++) {
    let best = 0, bv = -1; const off = k * C;
    for (let c = 0; c < C; c++) { const v = p[off + c]; if (v > bv) { bv = v; best = c; } }
    if (best !== 0 && best !== prev) { text += chars[best] || ""; confs.push(bv); }
    prev = best;
  }
  return { text: text.trim(), conf: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0 };
}

async function readFrame(rgba, w, h) {
  const boxes = await detect(rgba, w, h);
  const out = [], next = [];
  for (const b of boxes) {
    const sig = cropSig(rgba, w, b);
    // même ligne au même endroit qu'à l'image précédente : on réutilise la lecture
    const hit = cache.find((c) => Math.abs(c.b.x0 - b.x0) < 6 && Math.abs(c.b.y0 - b.y0) < 6 && Math.abs(c.b.x1 - b.x1) < 6 && Math.abs(c.b.y1 - b.y1) < 6 &&
      c.sig.reduce((s, v, i) => s + Math.abs(v - sig[i]), 0) / 64 < 6);
    const r = hit ? hit.r : await recognize(rgba, w, b);
    next.push({ b, sig, r });
    out.push({ ...b, text: r.text, conf: r.conf });
  }
  cache = next;
  return out;
}

self.onmessage = async (ev) => {
  const { id, cmd } = ev.data;
  try {
    if (cmd === "init") { await init(ev.data.threads); self.postMessage({ id, ok: true, result: { threads: ort.env.wasm.numThreads } }); }
    else if (cmd === "read") { const { buf, w, h } = ev.data; self.postMessage({ id, ok: true, result: await readFrame(new Uint8ClampedArray(buf), w, h) }); }
    else if (cmd === "reset") { cache = []; self.postMessage({ id, ok: true }); }
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
