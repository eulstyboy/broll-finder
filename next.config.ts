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
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/hofmann-trace/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
