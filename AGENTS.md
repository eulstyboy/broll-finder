<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# eulst.app — guide pour les agents (Codex, Claude…)

Ce dépôt sert **tout le site eulst.app**, le « laboratoire » d'eulst : une vitrine d'apps, d'outils et de jeux web. Le nom du dépôt, `broll-finder`, est historique (le premier outil hébergé ici). Ce fichier fait foi ; `docs/EULST-HOME.md` garde l'historique détaillé de chaque ajout.

Langue de travail : **français** (interface, textes, commentaires, messages de commit).

## Hébergement et déploiement

- Projet Vercel `broll-finder` (compte eulstyboys-projects). **Chaque push sur `main` part en production** sur eulst.app en une à deux minutes. Toute autre branche reçoit une URL de prévisualisation Vercel : l'utiliser pour faire tester un changement risqué avant de fusionner.
- Domaines servis par ce dépôt : `eulst.app`, `edit.eulst.app` (réécriture selon l'hôte, voir `next.config.ts`).
- Servis par **d'autres** dépôts et projets Vercel, à ne pas chercher ici : `renetiles.eulst.app` (dépôt `eulstyboy/rene-mosaic`), `resonances.eulst.app` (dépôt privé `resonances`). Hofmann Trace a aussi son dépôt source `eulstyboy/hofmann-trace` ; la copie servie ici est `public/hofmann-trace/`.
- Le site vitrine du studio, eulst.fr, est un autre projet.

## Carte du dépôt

| Chemin | Rôle |
| --- | --- |
| `src/app/[[...slug]]/page.tsx` | Route fourre-tout : `/` affiche la vitrine (`_lab.tsx`), `/broll` l'outil privé B-Roll (`_tool.tsx`), tout le reste en 404. |
| `src/app/_projects.ts` | **Liste des projets de la vitrine** (une entrée par app). Source unique de la vitrine. |
| `src/app/_lab.tsx` + `public/labo/lab.js`, `lab.css` | Vitrine « laboratoire » : un cube 3D en pixel art par projet, scroll à résistance, rayons Outils / Expériences / Le studio / Jeux, vibrations au scroll, lien discret vers les mentions légales. |
| `src/app/_site.ts` | Titre et description publics d'eulst.app, image de partage (`public/partage.png`, 1200 × 630) et fonction `share()` qui écrit les balises Open Graph et Twitter d'une page. |
| `src/app/mentions-legales/` | Page `/mentions-legales/` (éditeur, hébergeur, licences, données personnelles), dans le style de la vitrine, polices servies par `next/font`. |
| `src/app/robots.ts`, `src/app/sitemap.ts` | `/robots.txt` (bloque `/broll` et `/api/`) et `/sitemap.xml` (vitrine, Hofmann Trace, Bille, Lupercalia, mentions). |
| `src/app/_stats.tsx`, `public/stats.js` | Statistiques GoatCounter sans cookie, voir « Statistiques ». |
| `src/app/_landing.tsx`, `landing.module.css` | Ancien accueil, conservé comme solution de repli (non affiché). |
| `src/app/_tool.tsx`, `src/app/api/analyze*`, `src/app/api/extract` | B-Roll Finder, outil privé (IA Anthropic), derrière mot de passe. |
| `src/app/api/bille-scores/route.ts` | Classement en ligne de Bille Foraine (Upstash Redis). **Public.** |
| `src/app/scores/lupercalia/route.ts` | Classement en ligne de Lupercalia (Upstash Redis). Public car hors de `/api/`. |
| `src/app/api/coquille/route.ts` | Relecture par Claude pour Coquille. Protégée par mot de passe. |
| `src/proxy.ts` | Protection HTTP Basic de `/broll` et de `/api/*` (sauf `/api/bille-scores`). |
| `next.config.ts` | Réécritures des apps statiques, en-têtes (service workers, isolation cross-origin de Coquille). |
| `public/<app>/` | Apps statiques autonomes, voir le tableau suivant. |
| `public/projects/*.svg` | Vignettes de l'ancien accueil. |
| `figma-plugin/` | Plug-in Figma de Hofmann Trace (publié à part sur la Figma Community, pas déployé par Vercel). |
| `docs/EULST-HOME.md` | Historique et détails techniques de chaque ajout. |

## Apps servies sur eulst.app

| URL | Dossier | Dans la vitrine | Notes |
| --- | --- | --- | --- |
| `/` | `_lab.tsx` | — | Vitrine. |
| `/hofmann-trace/` | `public/hofmann-trace/` | oui (Outils) | Dessin vectoriel sur grille de cercles. PWA. **GPL-3.0** : garder la licence et les crédits. |
| `/lupercalia/` | `public/lupercalia/` | oui (Jeux) | Jeu de crêpes au gyroscope, Three.js. PWA. |
| `/bille/` | `public/bille/` | oui (Jeux) | Bille Foraine, jeu de bille au gyroscope. `game.js` + `levels.js`. PWA. |
| `/luciole/` | `public/luciole/` | non | Prototype : chasse au son, gyroscope + audio spatialisé, mode WebXR. |
| `/coquille/` | `public/coquille/` | non | Relecture des textes incrustés dans une vidéo : OCR PaddleOCR (ONNX Runtime Web) et Grammalecte dans le navigateur. Voir `public/coquille/LISEZMOI.txt`. Grammalecte est sous **GPL-3.0**. |
| `/edit/` et `edit.eulst.app` | `public/edit/` | non | Éditeur qui génère une entrée de `_projects.ts` (fiche, couleur, face de cube en pixel art). |
| `/mentions-legales/` | `src/app/mentions-legales/` | lien en pied de vitrine | Mentions légales et données personnelles. |
| `/broll` | `_tool.tsx` | masqué | Outil privé, mot de passe. Jamais indexé (`noindex`, `robots.txt`). |

## Ajouter ou modifier une app

1. Mettre l'app dans `public/<slug>/index.html` : HTML autonome, JavaScript sans étape de build. Les bibliothèques viennent d'un CDN à **version figée** (ex. `cdnjs …/three.js/r128/three.min.js`) ou sont copiées dans un dossier `vendor/` avec leur licence.
2. Ajouter la réécriture `{ source: "/<slug>/", destination: "/<slug>/index.html" }` dans `beforeFiles` (`next.config.ts`). Sans elle, la route fourre-tout répond 404. Le slash final est voulu (`trailingSlash: true`) : il garde les chemins relatifs et le périmètre des service workers corrects.
3. Pour la montrer dans la vitrine, ajouter une entrée dans `src/app/_projects.ts` : `id`, `name`, `category`, `description`, `href`, `access: "public"`, `color`, `traits` (2 ou 3 étiquettes), `section` (`"outil"`, `"experience"`, `"studio"` ou `"jeu"`, choisi dans l'éditeur au champ « Rayon »), `face` (pixel art, généré sur edit.eulst.app) et `visible: true`.
   Si l'app est servie par ce dépôt, l'ajouter aussi à `src/app/sitemap.ts`. Si elle envoie des données (scores, caméra, IA), mettre à jour la section « Données personnelles » de `src/app/mentions-legales/page.tsx`.
4. Quand un script change, monter son paramètre de version (`game.js?v=…`, `lab.js?v=…`) pour contourner le cache des navigateurs.

## Vitrine (`_lab.tsx`, `public/labo/`)

- Rendu serveur : premier projet et liste complète dans le HTML, données injectées en JSON (`#lab-data`), puis `lab.js` anime le tout (Three.js r128 depuis cdnjs, canvas basse résolution volontaire pour l'effet pixel).
- Réglages de ressenti dans `lab.js` : `RESIST` (pixels de molette pour changer d'objet, actuellement 380), seuil tactile (20 % de la hauteur d'écran), vitesse de charge au clavier.
- La face d'un cube vient de `face` (palette + lignes d'index en base 36, 8, 16 ou 32 lignes). Sans `face`, un dessin par défaut de `DRAW` dans `lab.js`.
- Vibrations : `navigator.vibrate` sur Android, astuce de l'interrupteur `<input switch>` caché sur iOS. Diagnostic : ajouter `#haptique` à l'URL.
- Accessibilité à préserver : navigation clavier (flèches, chiffres, Début/Fin), `prefers-reduced-motion`, annonces `aria-live`.
- Mobile (≤ 760 px) : logo, boutons de rayons, numéros 01 à 06 et lien des mentions ont une zone de clic d'au moins 44 × 44 px (pseudo-élément `::after` ou marge intérieure invisible). Garder cette règle pour tout nouvel élément cliquable, sans chevauchement entre zones.
- Liens entre la vitrine et les mentions : de simples `<a>` (chargement complet voulu, `lab.js` écoute la molette et le toucher sur toute la fenêtre).

## Jeux installables (PWA)

Hofmann Trace, Bille Foraine et Lupercalia ont chacun `manifest.webmanifest`, des icônes et un `sw.js` limité à leur dossier.

- Bille et Lupercalia : le service worker sert les fichiers **réseau d'abord** (les mises à jour arrivent seules) avec repli hors ligne, précharge polices et Three.js, et **ne met jamais en cache** les scores ni rien hors de son dossier.
- **Ne jamais changer l'`id` d'un manifeste** sans raison : cela crée une nouvelle app et casse les installations existantes. Bille a déjà changé une fois (`/bille/app`) pour réparer une installation corrompue.
- Les `sw.js` sont servis sans cache (`next.config.ts`) ; pour vider complètement le cache d'un jeu, incrémenter `CACHE` dans son `sw.js`.
- Gyroscope, caméra, micro et WebXR exigent le HTTPS : tester sur téléphone via une URL de prévisualisation Vercel, pas en local.

## Partage, référencement et statistiques

- Titre et description dans `src/app/_site.ts`. « eulst » toujours en minuscules dans les textes publics.
- Image de partage : `public/partage.png` (1200 × 630, pixel art). Fichier fixe, déclaré par `share()` : les fichiers `opengraph-image` de Next ne sont pas ajoutés aux pages qui définissent leur propre `openGraph`. À refaire à la main si la vitrine change beaucoup (même nom de fichier ; les réseaux gardent l'ancienne image en cache un moment).
- URL canonique : `https://eulst.app/` (`metadataBase` dans `layout.tsx`). `/robots.txt` et `/sitemap.xml` viennent de `robots.ts` et `sitemap.ts`. Hors plan : `/broll`, `/api/`, `/edit/`, `/coquille/`, `/luciole/`.
- Statistiques : GoatCounter, compte `eulst` partagé avec eulst.fr (`https://eulst.goatcounter.com`). `public/stats.js` préfixe les chemins par l'hôte (`eulst.app/bille/`) et ne compte rien hors du domaine `eulst.app` (local, prévisualisations) ni avec Do Not Track ou Global Privacy Control. Chargé par la vitrine et les mentions (`_stats.tsx`, seulement si `VERCEL_ENV === "production"`) et par `index.html` de Hofmann Trace, Bille et Lupercalia (leurs service workers ignorent `/stats.js` et GoatCounter). Toute nouvelle mesure doit être décrite dans les mentions légales.

## API, données et secrets

Variables d'environnement (configurées dans Vercel, **jamais dans le dépôt**) :

| Variable | Usage |
| --- | --- |
| `BASIC_AUTH_PASSWORD`, `BASIC_AUTH_USER` | Mot de passe de `/broll` et `/api/*`. Sans mot de passe, accès libre (pratique en local). |
| `ANTHROPIC_API_KEY` | B-Roll Finder et Coquille. |
| `COQUILLE_MODEL` | Modèle Claude de Coquille (facultatif). |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | Classements en ligne (Upstash Redis, intégration Vercel). La route de Lupercalia retrouve aussi ces variables avec un préfixe personnalisé. |

Règles :
- Tout ce qui est sous `/api/` est protégé par mot de passe. Une nouvelle API **publique** (classement d'un jeu, etc.) doit être ajoutée à l'exception de `src/proxy.ts`, ou placée hors de `/api/` comme `/scores/lupercalia`.
- Sans variables Upstash, les routes de classement répondent 503 et les jeux retombent sur leurs scores locaux : garder ce repli.
- Les routes de score gardent leurs garde-fous (scores impossibles refusés, limite d'envois par adresse, nombre d'entrées conservées).
- Ne jamais committer de clé, de `.env` ni de donnée personnelle.

## Vérifier avant de pousser

```bash
npm ci
npm run lint       # doit finir avec 0 erreur (des avertissements existent déjà)
npm run build      # next/font télécharge Geist depuis Google Fonts : le build a besoin d'Internet
npm run start      # puis vérifier les pages ci-dessous
```

À vérifier après un changement de routes ou de configuration : `/`, `/mentions-legales/`, `/robots.txt`, `/sitemap.xml`, `/partage.png`, `/hofmann-trace/`, `/bille/`, `/lupercalia/`, `/luciole/`, `/coquille/`, `/edit/`, chaque `manifest.webmanifest` et `sw.js`, `/broll` (doit demander le mot de passe si `BASIC_AUTH_PASSWORD` est défini) et une URL inconnue (404). Node 22.

## Conventions

- Textes de l'interface en français. Les jeux et la vitrine **tutoient** le joueur. Phrases courtes et concrètes.
- La marque s'écrit **eulst**, en minuscules. Dans les textes publics, les apps sont présentées comme « un projet eulst », sans le nom complet de l'auteur et sans appel à l'action commercial.
- Univers visuel des jeux et de la vitrine : pixel art, références Balatro / Slots & Daggers / Gambonanza, polices Pixelify Sans, Silkscreen, Jersey 10 et Courier Prime (Google Fonts). Bleu de marque `#4d5eff`.
- Commits en français, au format `Projet : ce qui change` (ex. `Bille Foraine : bouton « Installer le jeu »`). Un commit par changement cohérent.
- Le code tiers copié tel quel (`public/coquille/grammalecte/`, `public/coquille/vendor/`) n'est ni linté ni modifié.
- Ne pas supprimer `_landing.tsx`, les licences GPL, ni les crédits d'origine de Hofmann Trace et de Grammalecte.
- Avant de déplacer ou renommer le dossier d'une app, mettre à jour la réécriture, le `href` dans `_projects.ts`, le `scope`/`start_url` du manifeste et les chemins du service worker.
