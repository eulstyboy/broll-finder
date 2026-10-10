/**
 * Tableau des scores partagé de Lupercalia (eulst.app/lupercalia/).
 *
 * Stockage : Upstash Redis, ajouté au projet depuis le Marketplace Vercel.
 * L'intégration crée KV_REST_API_URL et KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_URL / _TOKEN).
 * Sans ces variables, la route répond 503 et le jeu garde ses scores dans le navigateur.
 *
 * Hors de /api/ exprès : /api/ est protégé par mot de passe (voir src/proxy.ts).
 */

const BOARD = "lupercalia:board";
const KEEP = 100; // on garde les 100 meilleurs
const TOP = 10;
// Une crêpe rapporte au plus 14 (louche +2, saut +2, note 10) et en coûte au plus 9 (louche −2, saut −2, par terre −5).
const MAX_CREPES = 15;
const MAX_LOST = 20;

type Entry = { name: string; score: number; crepes: number; date: string };

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const env = redisEnv();
  if (!env) throw new Error("storage");
  const res = await fetch(`${env.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("storage");
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => {
    if (r.error) throw new Error("storage");
    return r.result;
  });
}

function parseTop(flat: unknown): Entry[] {
  const arr = Array.isArray(flat) ? (flat as string[]) : [];
  const rows: Entry[] = [];
  for (let i = 0; i + 1 < arr.length; i += 2) {
    try {
      const m = JSON.parse(arr[i]) as { n: string; c: number; d: string };
      rows.push({ name: m.n, crepes: m.c, date: m.d, score: Number(arr[i + 1]) });
    } catch {
      // entrée illisible : on l'ignore
    }
  }
  return rows;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!redisEnv()) return json({ ok: false, reason: "storage" }, 503);
  try {
    const [top] = await pipeline([["ZREVRANGE", BOARD, 0, TOP - 1, "WITHSCORES"]]);
    return json({ ok: true, top: parseTop(top) });
  } catch {
    return json({ ok: false, reason: "storage" }, 502);
  }
}

export async function POST(req: Request) {
  if (!redisEnv()) return json({ ok: false, reason: "storage" }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, reason: "invalid" }, 400);
  }

  // Nom : 1 à 12 caractères imprimables.
  const name = String(body.name ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim()
    .slice(0, 12);
  const score = Number(body.score);
  const crepes = Number(body.crepes);
  const lost = Number(body.lost ?? 0);
  const plausible =
    name.length > 0 &&
    Number.isInteger(score) &&
    Number.isInteger(crepes) &&
    Number.isInteger(lost) &&
    crepes >= 1 &&
    crepes <= MAX_CREPES &&
    lost >= 0 &&
    lost <= MAX_LOST &&
    score <= crepes * 14 &&
    score >= -9 * (crepes + lost);
  if (!plausible) return json({ ok: false, reason: "invalid" }, 400);

  // Limite : 5 enregistrements par minute et par adresse.
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "inconnu";
  const rlKey = `lupercalia:rl:${ip}`;

  const member = JSON.stringify({
    n: name,
    c: crepes,
    d: new Date().toISOString().slice(0, 10),
    i: Math.random().toString(36).slice(2, 8),
  });

  try {
    const [hits] = await pipeline([
      ["INCR", rlKey],
      ["EXPIRE", rlKey, 60],
    ]);
    if (Number(hits) > 5) return json({ ok: false, reason: "rate" }, 429);

    const res = await pipeline([
      ["ZADD", BOARD, score, member],
      ["ZREMRANGEBYRANK", BOARD, 0, -(KEEP + 1)],
      ["ZREVRANK", BOARD, member],
      ["ZREVRANGE", BOARD, 0, TOP - 1, "WITHSCORES"],
    ]);
    const rank = res[2] == null ? null : Number(res[2]) + 1;
    return json({ ok: true, rank, top: parseTop(res[3]) });
  } catch {
    return json({ ok: false, reason: "storage" }, 502);
  }
}
