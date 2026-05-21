"use client";

import { usePathname } from "next/navigation";
import Tool from "../_tool";
import Landing from "../_landing";

// Route fourre-tout : "/" affiche l'accueil, "/broll" affiche l'outil.
// Un seul fichier page.tsx dans tout le projet (contrainte de l'environnement).
export default function Page() {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/broll")) return <Tool />;
  return <Landing />;
}
