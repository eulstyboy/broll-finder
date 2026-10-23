import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Coquille (eulst.app/coquille) : relecture des textes incrustés d'une vidéo par Claude.
 *
 * Reçoit uniquement les textes déjà lus dans le navigateur (jamais la vidéo) et renvoie,
 * pour chaque texte, les fautes trouvées et s'il s'agit d'un texte du décor (enseigne, logo…).
 * Route protégée par le mot de passe du site (voir src/proxy.ts : toutes les routes /api/ le sont).
 *
 * POST /api/coquille { video?: string, texts: [{ id, tc?, text }] }
 *  -> { results: [{ id, decor, issues: [{ extrait, remplacement, alternatives, type, explication, certitude }] }] }
 */

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const MODEL = process.env.COQUILLE_MODEL || 'claude-sonnet-4-6';
const MAX_TEXTS = 400;
const MAX_LEN = 800;

type InText = { id: string; tc?: string; text: string };

const SYSTEM = `Tu es correcteur professionnel pour la post-production vidéo, spécialiste du français écrit.
On te donne, dans l'ordre chronologique, les textes incrustés d'une vidéo (sous-titres, citations d'interview, narration, titres, noms et fonctions, cartons). Ils ont été lus automatiquement à l'image (OCR) : une ligne par retour à la ligne affiché.

Ta mission : relever toutes les fautes réelles, et seulement elles.
Vérifie : orthographe, accords (adjectifs, participes passés, verbes pronominaux), conjugaison, homophones (a/à, ce/se, on/ont, la/là, leur/leurs, quel que/quelque, dû/du…), mots manquants ou répétés (« c'est c'est »), tournures fautives (« pallier à », « se rappeler de », « malgré que », « pas autant + adjectif »…), ponctuation, majuscules, traits d'union (« ce moment-là »), typographie française (guillemets « », points de suspension), et la cohérence entre les textes (un même nom écrit de deux façons).

Règles :
- Les citations d'interview retranscrivent l'oral : les tournures familières correctement écrites (« y a », « ouais », « du coup », « eh bien ») ne sont pas des fautes. Une faute de langue du locuteur (« pas autant violent », « avez aspiration à ») se signale avec la certitude « oral ».
- Un sous-titre peut être un fragment de phrase qui continue dans le suivant : l'absence de majuscule initiale ou de point final n'est pas une faute dans ce cas.
- Les espaces insécables et la différence entre ' et ’ ne sont pas visibles fiablement : ne les signale pas.
- Si une faute ressemble à une erreur de lecture automatique (lettre confondue, mot coupé, caractère parasite), signale-la quand même avec la certitude « lecture » : l'utilisateur vérifiera sur l'image.
- Un texte du décor filmé (enseigne, marque sur un objet, panneau, logo de chaîne, inscription manuscrite) n'est pas une incrustation : marque-le decor=true et ne le corrige pas.
- « extrait » doit être copié exactement depuis le texte fourni (même casse, mêmes accents), le plus court possible autour de la faute ; « remplacement » est ce qui doit le remplacer.
- Explication : une phrase claire en français, avec la règle.
- N'invente pas de faute. Un texte correct n'a aucune entrée dans issues.

Appelle l'outil « rapport » avec un résultat pour chaque identifiant fourni.`;

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Clé API Anthropic absente sur le serveur (ANTHROPIC_API_KEY).' }, { status: 500 });
    }
    const body = await req.json();
    const texts: InText[] = Array.isArray(body?.texts) ? body.texts : [];
    if (!texts.length) return NextResponse.json({ results: [] });
    if (texts.length > MAX_TEXTS) return NextResponse.json({ error: `Trop de textes (${texts.length}, maximum ${MAX_TEXTS}).` }, { status: 413 });
    const clean = texts
      .filter((t) => t && typeof t.id === 'string' && typeof t.text === 'string')
      .map((t) => ({ id: t.id.slice(0, 40), tc: typeof t.tc === 'string' ? t.tc.slice(0, 40) : '', text: t.text.slice(0, MAX_LEN) }));
    const video = typeof body?.video === 'string' ? body.video.slice(0, 120) : '';

    const listing = clean.map((t) => `<texte id="${t.id}"${t.tc ? ` tc="${t.tc}"` : ''}>\n${t.text}\n</texte>`).join('\n');
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [
        {
          name: 'rapport',
          description: 'Renvoie, pour chaque texte, les fautes trouvées et s’il appartient au décor.',
          input_schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    decor: { type: 'boolean', description: 'true si le texte fait partie du décor filmé' },
                    issues: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          extrait: { type: 'string', description: 'Passage fautif copié exactement depuis le texte' },
                          remplacement: { type: 'string', description: 'Texte qui remplace l’extrait' },
                          alternatives: { type: 'array', items: { type: 'string' } },
                          type: { type: 'string', enum: ['orthographe', 'grammaire', 'conjugaison', 'ponctuation', 'typographie', 'coherence', 'style'] },
                          explication: { type: 'string' },
                          certitude: { type: 'string', enum: ['sur', 'probable', 'oral', 'lecture'] },
                        },
                        required: ['extrait', 'remplacement', 'type', 'explication', 'certitude'],
                      },
                    },
                  },
                  required: ['id', 'decor', 'issues'],
                },
              },
            },
            required: ['results'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'rapport' },
      messages: [{ role: 'user', content: `Vidéo : « ${video || 'sans titre'} »\n\n${listing}` }],
    });

    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Réponse trop longue : relance sur une vidéo plus courte.' }, { status: 422 });
    }
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: "Claude n'a pas renvoyé de résultat exploitable." }, { status: 502 });
    }
    return NextResponse.json({ ...(toolUse.input as object), model: MODEL });
  } catch (error: unknown) {
    console.error('Erreur API /coquille:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
