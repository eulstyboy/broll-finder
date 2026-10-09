# Accueil Eulst

L’accueil se trouve dans `src/app/_landing.tsx`. Les projets et le logo se configurent dans `src/app/_projects.ts`. Le CSS est limité au composant grâce à `landing.module.css`.

L’accueil est rendu côté serveur. Le composant B-Roll n’est importé que pour `/broll`. Les URLs inconnues renvoient une 404. La protection existante dans `src/proxy.ts` reste inchangée, et les liens ordinaires n’effectuent pas de préchargement de l’outil privé.

## Hofmann Trace

Les fichiers autonomes v1.7.1 sont dans `public/hofmann-trace/`. L’URL `/hofmann-trace` redirige vers `/hofmann-trace/`, qui sert `index.html` par réécriture avant la route fourre-tout. Le slash final conserve la bonne résolution des ressources relatives et du périmètre PWA. `skipTrailingSlashRedirect` empêche Next.js de retirer ce slash ; `/broll/` conserve une redirection explicite vers `/broll`.

Le cache du service worker utilise le préfixe `eulst-app-hofmann-trace-`, distinct des autres installations de Hofmann Trace. À chaque mise à jour des fichiers, augmenter la version dans `sw.js` pour proposer l’actualisation aux personnes ayant installé l’outil.

Hofmann Trace est distribué sous GPL-3.0-only. La licence est incluse dans son dossier. Son fichier HTML autonome contient le code source lisible, et les crédits d’origine restent dans l’application. Sources du projet : https://github.com/eulstyboy/hofmann-trace ; projet original : https://github.com/bbtgnn/hofmann-1.0.0.

## Vérification avant publication

Exécuter `npm ci` et `npm run build`, puis tester les pages sur le serveur Next.js. Vérifier `/`, `/hofmann-trace`, `/hofmann-trace/`, `/hofmann-trace/manifest.webmanifest`, `/hofmann-trace/sw.js`, `/broll` et une URL inconnue.

Avec `BASIC_AUTH_PASSWORD` configuré, B-Roll et ses API doivent continuer de demander une authentification ; l’accueil et Hofmann restent publics. Ne pas saisir de vraie clé API pour tester la simple page d’accueil.

## Accueil « laboratoire » (oct. 2026)

L’accueil `/` affiche désormais `src/app/_lab.tsx` : un objet 3D par projet visible et public, avec un scroll à forte résistance. Les projets, leurs textes, leur couleur (`color`) et leurs étiquettes (`traits`) viennent toujours de `src/app/_projects.ts`. L’animation et le style sont dans `public/labo/lab.js` et `public/labo/lab.css` ; Three.js est chargé depuis cdnjs. Le réglage de résistance est `RESIST` dans `lab.js`.

L’ancien accueil reste dans `src/app/_landing.tsx`. Pour y revenir, réimporter `Landing` dans `src/app/[[...slug]]/page.tsx`.

Un projet peut aussi recevoir une face de cube dessinée en pixel art via le champ `face` (palette + lignes d’index), généré par l’éditeur de projet. Sans `face`, le cube garde son dessin par défaut.
