import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Next.js gère lui-même le slash final, sans redirection personnalisée en boucle.
  // Les fichiers .html, .js et les autres ressources restent servis sans slash.
  trailingSlash: true,
  async rewrites() {
    return {
      // Résoudre l'outil statique avant la route [[...slug]].
      beforeFiles: [
        { source: "/hofmann-trace/", destination: "/hofmann-trace/index.html" },
        { source: "/bille/", destination: "/bille/index.html" },
        { source: "/lupercalia/", destination: "/lupercalia/index.html" },
        { source: "/luciole/", destination: "/luciole/index.html" },
        { source: "/coquille/", destination: "/coquille/index.html" },
        // Éditeur de projets : edit.eulst.app (domaine à ajouter au projet Vercel) et eulst.app/edit/.
        { source: "/", has: [{ type: "host", value: "edit.eulst.app" }], destination: "/edit/index.html" },
        { source: "/edit/", destination: "/edit/index.html" },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/hofmann-trace/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      // Coquille : isolation cross-origin pour que la lecture PaddleOCR utilise plusieurs cœurs (SharedArrayBuffer).
      // « credentialless » laisse passer Google Fonts ; Safari l'ignore et tourne alors sur un seul cœur.
      {
        source: "/coquille/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      // Jeux installables : le service worker doit toujours être relu pour livrer les mises à jour.
      ...["bille", "lupercalia"].map((game) => ({
        source: `/${game}/sw.js`,
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      })),
    ];
  },
};

export default nextConfig;
