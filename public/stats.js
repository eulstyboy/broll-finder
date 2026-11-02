/* Statistiques de visite d'eulst.app : GoatCounter, sans cookie (compte « eulst », partagé avec eulst.fr).
   Les chemins sont préfixés par l'hôte (« eulst.app/bille/ ») pour ne pas se mêler à ceux d'eulst.fr.
   Rien n'est compté hors d'eulst.app (local, prévisualisations Vercel) ni avec Do Not Track / Global Privacy Control.
   Chargé par la vitrine, les mentions légales et les apps statiques (Hofmann Trace, Bille, Lupercalia). */
(function () {
  if (location.hostname !== "eulst.app") return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  window.goatcounter = { path: function (p) { return location.host + p; } };
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://eulst.goatcounter.com/count");
  document.head.appendChild(s);
})();
