import type { Metadata } from "next";
import { Courier_Prime, Pixelify_Sans, Silkscreen } from "next/font/google";
import { share } from "../_site";
import Stats from "../_stats";
import s from "./mentions.module.css";

// Polices de la vitrine servies par le site lui-même (next/font) : cette page n'appelle pas Google Fonts.
const display = Pixelify_Sans({ subsets: ["latin"], weight: "700", variable: "--font-display" });
const label = Silkscreen({ subsets: ["latin"], weight: "400", variable: "--font-label" });
const body = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });

const TITLE = "Mentions légales — eulst.app";
const DESCRIPTION = "Éditeur, hébergeur, propriété intellectuelle et données personnelles d’eulst.app.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/mentions-legales/" },
  ...share(TITLE, DESCRIPTION, "/mentions-legales/"),
};

export default function MentionsLegales() {
  return (
    <div className={`${s.page} ${display.variable} ${label.variable} ${body.variable}`}>
      <div className={s.wrap}>
        {/* Chargement complet voulu : la vitrine démarre lab.js au chargement de la page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={s.back} href="/">← Laboratoire</a>
        <h1 className={s.title}>Mentions légales</h1>

        <section className={s.block}>
          <h2>Éditeur</h2>
          <p>
            Raphaël Dahan / eulst<br />
            3/5 impasse du 49 rue du faubourg Saint-Martin, 75010 Paris, France<br />
            E-mail : <a href="mailto:hello@eulst.fr">hello@eulst.fr</a>
          </p>
          <p>
            Entrepreneur individuel<br />
            SIRET : 528 772 098 [À VÉRIFIER]<br />
            TVA intracommunautaire : FR34528772098
          </p>
          <p>Directeur de la publication : Raphaël Dahan</p>
        </section>

        <section className={s.block}>
          <h2>Hébergeur</h2>
          <p>
            Vercel Inc.<br />
            440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis<br />
            <a href="https://vercel.com" rel="noopener">vercel.com</a>
          </p>
        </section>

        <section className={s.block}>
          <h2>Propriété intellectuelle</h2>
          <p>
            Les textes, images, cubes et jeux d’eulst.app sont la propriété d’eulst, sauf mention contraire.
            Le code tiers garde la licence de chaque app : Hofmann Trace et Grammalecte (utilisé par Coquille)
            sont distribués sous licence GPL-3.0, avec les crédits de leurs auteurs d’origine.
          </p>
        </section>

        <section className={s.block}>
          <h2>Données personnelles</h2>
          <p>
            eulst.app ne demande aucun compte et ne dépose aucun cookie. Il n’y a ni publicité ni pistage publicitaire.
          </p>

          <h3>Statistiques de visite</h3>
          <p>
            La fréquentation est mesurée avec <a href="https://www.goatcounter.com" rel="noopener">GoatCounter</a>, sans cookie,
            sur la page d’accueil, cette page et les apps Hofmann Trace, Bille Foraine et Lupercalia. GoatCounter compte les pages vues
            avec la page, le site d’origine, le navigateur, le système, la taille d’écran, la langue et le pays déduit de l’adresse IP.
            L’adresse IP n’est pas conservée. Les données sont hébergées en Europe (Finlande et Allemagne).
            Rien n’est compté si le navigateur envoie le signal « Do Not Track » ou « Global Privacy Control ».
          </p>

          <h3>Classements de Bille Foraine et Lupercalia</h3>
          <p>
            Envoyer un score est facultatif. Le classement enregistre le pseudo choisi, le score et quelques
            informations de partie : pour Bille Foraine, les manches jouées et gagnées, la date et l’heure,
            et un identifiant de partie tiré au hasard ; pour Lupercalia, le nombre de crêpes et la date du jour.
            Ces données sont publiques dans le classement et stockées chez Upstash (base Redis, via Vercel), région [À VÉRIFIER].
          </p>
          <p>
            Bille Foraine garde les 500 meilleurs scores, Lupercalia les 100 meilleurs : une entrée disparaît quand elle sort
            de ce nombre, sans autre durée limite. Pour limiter les envois, l’adresse IP sert de clé à un compteur
            effacé automatiquement au bout de 60 secondes. Elle n’est pas enregistrée avec le score.
          </p>

          <h3>Dans le navigateur</h3>
          <p>
            Les outils et les jeux gardent leurs réglages, dessins, pseudos et scores dans le stockage local du navigateur,
            sur l’appareil. Ces données ne sont pas envoyées, sauf un score que l’on choisit de publier au classement.
          </p>

          <h3>Résonances</h3>
          <p>
            Résonances fonctionne sur un autre sous-domaine, <a href="https://resonances.eulst.app" rel="noopener">resonances.eulst.app</a>.
            L’image de la caméra y est traitée dans l’appareil. Le détail est présenté dans l’app.
          </p>

          <h3>Coquille</h3>
          <p>
            Coquille lit les textes d’une vidéo dans le navigateur ; la vidéo n’est pas envoyée. La relecture par Claude,
            réservée aux personnes qui ont le mot de passe, transmet les textes lus et le nom du fichier à l’API d’Anthropic.
          </p>

          <h3>Hébergement et ressources tierces</h3>
          <p>
            Pour servir le site, Vercel traite l’adresse IP et les informations techniques de chaque requête dans ses journaux,
            conservés [À VÉRIFIER]. La page d’accueil et plusieurs apps chargent leurs polices depuis Google Fonts ; la page d’accueil
            et Lupercalia chargent Three.js depuis cdnjs (Cloudflare). Ces services reçoivent l’adresse IP du navigateur.
          </p>

          <h3>Contact</h3>
          <p>
            Pour toute question, ou pour faire retirer un pseudo d’un classement : <a href="mailto:hello@eulst.fr">hello@eulst.fr</a>.
            Vous pouvez aussi adresser une réclamation à la <a href="https://www.cnil.fr" rel="noopener">CNIL</a>.
          </p>
        </section>

        <p className={s.foot}>eulst.app · un projet eulst</p>
      </div>
      <Stats />
    </div>
  );
}
