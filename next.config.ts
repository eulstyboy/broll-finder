import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On dit au moteur de Next.js de ne pas compresser pdf-parse
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;