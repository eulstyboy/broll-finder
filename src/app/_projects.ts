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
