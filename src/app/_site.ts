import type { Metadata } from "next";

// Textes publics communs à eulst.app (titre de l'accueil, balises de partage).
// « eulst » s'écrit toujours en minuscules.
export const SITE_URL = "https://eulst.app";
export const TITLE = "eulst — outils & explorations";
export const DESCRIPTION =
  "Le laboratoire d’eulst : des outils pour dessiner, des expériences, des jeux au gyroscope et le studio de motion design. Tout s’ouvre dans le navigateur.";

// Image de partage 1200 × 630 (public/partage.png), déclarée explicitement : Next n'ajoute pas
// les fichiers opengraph-image aux pages qui définissent leur propre openGraph.
const IMAGE = {
  url: "/partage.png",
  width: 1200,
  height: 630,
  alt: "eulst.app, le laboratoire d’eulst : des cubes en pixel art pour les outils, les expériences, le studio et les jeux.",
};

// Balises Open Graph et Twitter d'une page. Sans path, pas d'og:url (pages hors plan du site).
export function share(title: string, description: string, path?: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", locale: "fr_FR", siteName: "eulst.app", title, description, images: [IMAGE], ...(path ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title, description, images: [IMAGE] },
  };
}
