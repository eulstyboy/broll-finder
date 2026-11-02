import type { MetadataRoute } from "next";
import { SITE_URL } from "./_site";

// /robots.txt : tout est public sauf l'outil privé B-Roll et les routes d'API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/broll", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
