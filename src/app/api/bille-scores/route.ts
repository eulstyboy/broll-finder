import { NextResponse } from "next/server";

/**
 * Classement partagé de Bille Foraine (eulst.app/bille).
 *
 * Stockage : une base Redis Upstash, ajoutée au projet Vercel depuis l'onglet Storage.
 * Variables lues (l'intégration les crée toute seule) :
 *   - KV_REST_API_URL / KV_REST_API_TOKEN
 *   - ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * Sans ces variables, la route répond 503 et le jeu garde les scores sur le téléphone du joueur.
 *
 * GET  /api/bille-scores?run=<id>  -> { top: [...10], rank, me }
 * POST /api/bille-scores { run, name, score, round, won } -> idem, après enregistrement
 */

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const ZKEY = "bille:scores";
const HKEY = "bille:runs";
const TOP = 10;
const KEEP = 500;
const RUN_RE = /^[a-z0-9]{8,24}$/;

type Entry = { name: string; score: number; round: number; won: number; at: number };
type Cmd = (string | number)[];

async function redis(commands: Cmd[]): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

function parseEntry(raw: unknown): Entry | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as Entry;
  } catch {
    return null;
  }
}

async function readBoard(run?: string) {
  const [flat] = (await redis([["ZREVRANGE", ZKEY, 0, TOP - 1, "WITHSCORES"]])) as [string[]];
  const ids: string[] = [];
  for (let i = 0; i < (flat || []).length; i += 2) ids.push(flat[i]);
  const cmds: Cmd[] = [];
  if (ids.length) cmds.push(["HMGET", HKEY, ...ids]);
  if (run) cmds.push(["ZREVRANK", ZKEY, run], ["HGET", HKEY, run]);
  const res = cmds.length ? await redis(cmds) : [];
  const raws = ids.length ? (res[0] as unknown[]) : [];
  const top = ids
    .map((id, i) => {
      const e = parseEntry(raws[i]);
      return e ? { run: id, ...e } : null;
    })
    .filter(Boolean);
  let rank: number | null = null;
  let me: (Entry & { run: string }) | null = null;
  if (run) {
    const off = ids.length ? 1 : 0;
    const r = res[off];
    rank = typeof r === "number" ? r + 1 : null;
    const e = parseEntry(res[off + 1]);
    me = e ? { run, ...e } : null;
  }
  return { top, rank, me };
}

const notConfigured = () => NextResponse.json({ error: "not_configured" }, { status: 503 });

export async function GET(req: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) return notConfigured();
  const run = new URL(req.url).searchParams.get("run") || "";
  try {
    return NextResponse.json(await readBoard(RUN_RE.test(run) ? run : undefined), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!REDIS_URL || !REDIS_TOKEN) return notConfigured();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const run = String(body.run || "");
  const name =
    String(body.name || "")
      .replace(/[\u0000-\u001f<>]/g, "")
      .trim()
      .slice(0, 14) || "Anonyme";
  const score = Math.floor(Number(body.score));
  const round = Math.floor(Number(body.round));
  const won = Math.floor(Number(body.won));
  // contrôles de vraisemblance : un score ne peut pas dépasser ce qu'une partie rapporte au mieux
  if (!RUN_RE.test(run) || !Number.isFinite(score) || !Number.isFinite(round) || !Number.isFinite(won)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (score < 0 || round < 1 || round > 500 || won < 0 || won > round || score > round * 500) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  try {
    const rl = `bille:rl:${ip}`;
    const [count] = await redis([["INCR", rl], ["EXPIRE", rl, 60]]);
    if (typeof count === "number" && count > 8) {
      return NextResponse.json({ error: "too_many" }, { status: 429 });
    }
    const entry: Entry = { name, score, round, won, at: Date.now() };
    const [changed] = await redis([["ZADD", ZKEY, "GT", "CH", score, run]]);
    if (changed === 1) await redis([["HSET", HKEY, run, JSON.stringify(entry)]]);
    else await redis([["HSETNX", HKEY, run, JSON.stringify(entry)]]);
    // on ne garde que les meilleurs scores
    await redis([["ZREMRANGEBYRANK", ZKEY, 0, -(KEEP + 1)]]);
    return NextResponse.json(await readBoard(run), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
