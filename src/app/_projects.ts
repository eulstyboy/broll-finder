export type Project = {
  id: string;
  name: string;
  category: string;
  description: string;
  href: string;
  access: "public" | "private";
  artwork: "hofmann" | "broll" | "generic";
  // Chemin du fichier dans public, sans le préfixe public.
  image?: string;
  // Légende sous la vignette ; sinon celle de l'illustration par défaut.
  caption?: string;
  // Vitrine de l'accueil : couleur de l'objet et petites étiquettes sous la description.
  color?: string;
  traits?: string[];
  // Face du cube en pixel art (générée par l'éditeur de projet) : palette + lignes d'index (0-9, a-z).
  // 8, 16 ou 32 lignes. Sans face, le cube garde son dessin par défaut.
  face?: { palette: string[]; rows: string[] };
  visible: boolean;
};

// Dupliquer une entrée pour ajouter un projet. visible: false le masque de l'accueil.
// Ce réglage ne change jamais la protection du projet ou de son API.
export const projects: Project[] = [
  {
    id: "hofmann-trace",
    name: "Hofmann Trace",
    category: "Design · Dessin vectoriel",
    description: "Une grille, des cercles, des possibilités. Composez des formes et explorez un autre rythme de dessin.",
    href: "/hofmann-trace/",
    access: "public",
    artwork: "hofmann",
    image: "/projects/hofmann-trace.svg",
    color: "#4d5eff",
    traits: ["Vectoriel", "Export SVG · EPS", "Mobile"],
    visible: true,
  },
  {
    id: "rene-tiles",
    name: "René Tiles",
    category: "Photo · Mosaïque",
    description: "Des centaines de photos, un seul portrait. Composez votre mosaïque et retrouvez chaque image sur son propre calque.",
    href: "https://renetiles.eulst.app",
    access: "public",
    artwork: "generic",
    image: "/projects/rene-tiles.svg",
    caption: "Chaque photo trouve sa place.",
    color: "#ff8a3d",
    traits: ["100 % local", "Calques"],
    visible: true,
  },
  {
    id: "resonances",
    name: "Résonances",
    category: "Art · Musique",
    description: "Regardez un tableau : votre regard en joue la musique. Une simple caméra suffit, aucune image ne quitte votre appareil.",
    href: "https://resonances.eulst.app",
    access: "public",
    artwork: "generic",
    image: "/projects/resonances.svg",
    caption: "La couleur est la touche. L’œil est le marteau.",
    color: "#ff4f9a",
    traits: ["Suivi du regard", "Caméra", "Son"],
    visible: true,
  },
  {
    id: "broll-finder",
    name: "B-Roll Finder",
    category: "Vidéo · Intelligence artificielle",
    description: "Du script aux images. Préparez vos plans de coupe, vos recherches et votre storyboard avec l’IA.",
    href: "/broll",
    access: "private",
    artwork: "broll",
    image: "/projects/broll-finder.svg",
    visible: false,
  },
];

// Remplacer null par "/logo.svg", puis déposer votre logo dans public/logo.svg.
export const brand = { logo: null as string | null, website: "https://eulst.fr" };
