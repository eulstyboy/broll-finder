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
  // Rayon de la vitrine : outils, expériences ou jeux (ordre d'affichage sur l'accueil).
  section?: "outil" | "experience" | "jeu";
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
    section: "outil",
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
    section: "outil",
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
    section: "experience",
    visible: true,
  },
  {
    id: "lupercalia",
    name: "Lupercalia",
    category: "Jeu · Gyroscope",
    description: "Le chef crie, tu exécutes. Beurre, louche, et fais sauter : une minute trente pour servir un max de crêpes.",
    href: "/lupercalia/",
    access: "public",
    artwork: "generic",
    caption: "Fais sauter !",
    color: "#f0b046",
    traits: ["Gyroscope", "Physique 3D", "1'30"],
    face: {
      palette: ["#140f1c", "#2a2236", "#1c1817", "#3a302c", "#f0b046", "#ffd35a", "#c47a2c", "#7a4a26", "#b8c0c8", "#fff3c4"],
      rows: [
        "0111111011111101",
        "1111133223311011",
        "1113322442233111",
        "1112244444422111",
        "1132469454642311",
        "1124445444444211",
        "1324444444544230",
        "0324454446444231",
        "1124644444444211",
        "1132444645442311",
        "1132444444442311",
        "1113244444423111",
        "1101322222281111",
        "1011113333771110",
        "0111111011771101",
        "1111110111771011",
      ],
    },
    section: "jeu",
    visible: true,
  },
  {
    id: "bille-foraine",
    name: "Bille Foraine",
    category: "Jeu · Gyroscope",
    description: "Incline ton téléphone pour guider la bille jusqu’au trou. Ramasse les pièces, achète des billes à pouvoir, affronte les boss.",
    href: "/bille/",
    access: "public",
    artwork: "generic",
    caption: "Vise le trou.",
    color: "#e2483d",
    traits: ["Gyroscope", "Billes à pouvoir", "Boss"],
    face: {
      palette: ["#0f1719", "#e2483d", "#9b2a25", "#f3e9d2", "#f2b544", "#1b2629", "#243337", "#070b0c", "#a8721f", "#ff8a7a"],
      rows: [
        "1111111111111111",
        "1555565555565551",
        "1550055555644551",
        "1507705556434451",
        "1507705565448461",
        "1650055655588651",
        "1555511115556551",
        "1555193111565551",
        "1555131111055551",
        "1556111112000051",
        "1565111122077001",
        "1655512220077701",
        "1555550000777701",
        "1555565550077001",
        "1555655555000051",
        "1111111111111111",
      ],
    },
    section: "jeu",
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
    section: "outil",
    visible: false,
  },
];

// Remplacer null par "/logo.svg", puis déposer votre logo dans public/logo.svg.
export const brand = { logo: null as string | null, website: "https://eulst.fr" };
