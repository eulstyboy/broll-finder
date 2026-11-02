import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Lab from "../_lab";
import { DESCRIPTION, TITLE, share } from "../_site";

type PageProps = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  if (slug.length === 0) {
    return {
      title: TITLE,
      description: DESCRIPTION,
      alternates: { canonical: "/" },
      ...share(TITLE, DESCRIPTION, "/"),
    };
  }
  // Outil privé : jamais indexé.
  if (slug.length === 1 && slug[0] === "broll") {
    return { title: "B-Roll Finder — Du script au storyboard", robots: { index: false, follow: false } };
  }
  return {};
}

export default async function Page({ params }: PageProps) {
  const { slug = [] } = await params;
  if (slug.length === 0) return <Lab />;
  if (slug.length === 1 && slug[0] === "broll") {
    // L'outil et ses dépendances ne sont utilisés que sur sa propre page.
    const { default: Tool } = await import("../_tool");
    return <Tool />;
  }
  notFound();
}
