import type { MetadataRoute } from "next";
import { SITE_URL } from "./_site";

// /sitemap.xml : la vitrine, les apps publiques servies par ce dépôt et les mentions légales.
// Hors plan : /broll et /api/ (privés), /edit/, /coquille/ et /luciole/ (absents de la vitrine).
const PATHS = ["/", "/hofmann-trace/", "/bille/", "/lupercalia/", "/mentions-legales/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
}
