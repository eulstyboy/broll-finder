import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { review, type CallModel } from './review';

/**
 * Coquille (eulst.app/coquille) : relecture des textes incrustés d'une vidéo par Claude.
 *
 * Reçoit uniquement les textes déjà lus dans le navigateur (jamais la vidéo, plus le nom du fichier) et renvoie,
 * pour chaque texte, les fautes trouvées et s'il s'agit d'un texte du décor (enseigne, logo…).
 * Route protégée par le mot de passe du site (voir src/proxy.ts : toutes les routes /api/ le sont).
 * La logique (nettoyage, échappement, validation de la réponse) est dans ./review.ts, testée sans appel réseau.
 *
 * POST /api/coquille { texts: [{ id, tc?, text }] }
 *  -> { results: [{ id, decor, issues: [{ extrait, remplacement, alternatives, type, explication, certitude }] }],
 *       dropped, model, usage: { input_tokens, output_tokens } }
 */

export const maxDuration = 120;

const MODEL = process.env.COQUILLE_MODEL || 'claude-sonnet-4-6';
let client: Anthropic | null = null;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Relecture Claude non configurée sur le serveur.' }, { status: 500 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  try {
    client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const anthropic = client;
    const callModel: CallModel = (params) => anthropic.messages.create(params);
    const { status, json } = await review(body, MODEL, callModel);
    return NextResponse.json(json, { status });
  } catch (error: unknown) {
    // Journal serveur sans le contenu envoyé ; message générique côté navigateur.
    const status = error instanceof Anthropic.APIError ? error.status : undefined;
    console.error('Erreur API /coquille:', status ?? '', error instanceof Error ? error.name : 'inconnue');
    return NextResponse.json({ error: 'La relecture Claude a échoué. Réessaie dans un instant.' }, { status: 502 });
  }
}
