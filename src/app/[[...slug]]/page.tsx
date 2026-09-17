import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing from "../_landing";

type PageProps = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  if (slug.length === 0) {
    return {
      title: "Eulst — Outils & explorations",
      description: "Des outils faits maison pour dessiner, créer et essayer autrement. Découvrez Hofmann Trace et les projets de l’atelier numérique Eulst.",
      alternates: { canonical: "https://eulst.app" },
    };
  }
  return { title: "B-Roll Finder — Du script au storyboard" };
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;
  if (slug.length === 0) return <Landing />;
  if (slug.length === 1 && slug[0] === "broll") {
    // L'outil et ses dépendances ne sont utilisés que sur sa propre page.
    const { default: Tool } = await import("../_tool");
    return <Tool />;
  }
  notFound();
}
