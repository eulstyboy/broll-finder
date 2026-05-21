import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Indications de style selon le role choisi dans l'interface.
const ROLE_HINTS: Record<string, string> = {
  motion:
    'Style Motion Design : formes graphiques, transitions dynamiques, abstractions.',
  doc: 'Style Documentaire : plans reels, naturels, authentiques, lumiere naturelle.',
  commercial:
    'Style Publicite : plans leches, produits, lifestyle aspirationnel.',
  experimental:
    'Style Experimental : cadrages audacieux, textures, lumieres creatives.',
};

export async function POST(req: Request) {
  try {
    const { script, role, model } = await req.json();

    if (!script || typeof script !== 'string' || !script.trim()) {
      return NextResponse.json({ error: 'Le script est vide.' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            'Cle API absente. Renseignez ANTHROPIC_API_KEY dans le fichier .env.local.',
        },
        { status: 500 }
      );
    }

    const roleHint = role && ROLE_HINTS[role] ? `\n3. ${ROLE_HINTS[role]}` : '';

    const systemPrompt = `Tu es un Directeur Artistique Senior specialise en Motion Design et cinematographie.
Tu traduis un script en plans de coupe (B-Roll) concrets et visuels.

Pour chaque phrase du script, propose 3 variations de requetes de recherche pour banques de stock :
- Plan A (Cinematique) : lumiere, mouvement de camera, profondeur de champ.
- Plan B (Symbolique) : metaphore, detail, objet signifiant.
- Plan C (Action / Rythme) : humain, interaction, dynamisme.

Regles :
1. Uniquement des mots-cles courts en anglais (ex : "slow motion, office meeting, professional"), jamais de phrases.
2. Emploie un vocabulaire technique : "macro lens", "dolly shot", "golden hour", "shallow depth of field".${roleHint}

Appelle l'outil "provide_brief" pour structurer ta reponse.`;

    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-6',
      // 1024 etait trop faible : la reponse etait tronquee et JSON.parse plantait.
      max_tokens: 16000,
      system: systemPrompt,
      tools: [
        {
          name: 'provide_brief',
          description:
            'Renvoie la liste des plans du script et leurs requetes de recherche.',
          input_schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                description: 'Un element par phrase / plan du script.',
                items: {
                  type: 'object',
                  properties: {
                    sentence: {
                      type: 'string',
                      description: 'La phrase du script correspondant au plan.',
                    },
                    queries: {
                      type: 'array',
                      description: 'Exactement 3 requetes de mots-cles.',
                      items: { type: 'string' },
                    },
                  },
                  required: ['sentence', 'queries'],
                },
              },
            },
            required: ['results'],
          },
        },
      ],
      // On force l'usage de l'outil : la reponse est un objet JSON valide,
      // plus besoin de nettoyer des ```json ni de faire un JSON.parse fragile.
      tool_choice: { type: 'tool', name: 'provide_brief' },
      messages: [{ role: 'user', content: script }],
    });

    // Si la sortie a quand meme ete tronquee, on le signale clairement.
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json(
        {
          error:
            'Script trop long pour une seule analyse. Reduisez-le ou decoupez-le en parties.',
        },
        { status: 422 }
      );
    }

    const toolUse = response.content.find(
      (block) => block.type === 'tool_use'
    );
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: "Le modele n'a pas renvoye de resultat exploitable." },
        { status: 502 }
      );
    }

    // toolUse.input est deja un objet conforme au schema ci-dessus.
    return NextResponse.json(toolUse.input);
  } catch (error: unknown) {
    console.error('Erreur API /analyze:', error);
    const message =
      error instanceof Error ? error.message : "Erreur lors de l'analyse du script.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
