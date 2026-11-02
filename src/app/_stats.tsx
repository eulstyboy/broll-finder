// Statistiques GoatCounter (public/stats.js), incluses seulement en production Vercel.
// stats.js vérifie aussi l'hôte et Do Not Track avant de charger quoi que ce soit.
export default function Stats() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return <script src="/stats.js?v=1" async />;
}
