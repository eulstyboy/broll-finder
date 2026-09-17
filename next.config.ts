import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Le slash final conserve l'outil dans le périmètre de son service worker.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      { source: "/hofmann-trace", destination: "/hofmann-trace/", permanent: false },
      { source: "/broll/", destination: "/broll", permanent: false },
    ];
  },
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
