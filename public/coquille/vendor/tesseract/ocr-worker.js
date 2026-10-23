/* Coquille : enveloppe du worker Tesseract.js.
   Le modèle français est embarqué en base64 dans un fichier JSON (format accepté partout) ;
   quand Tesseract demande « fra.traineddata », on lui sert ces octets au lieu d'un téléchargement. */
"use strict";
const nativeFetch = self.fetch.bind(self);
self.fetch = async (url, opts) => {
  if (String(url).endsWith("/fra.traineddata")) {
    const j = await (await nativeFetch(new URL("lang/fra.traineddata.json", self.location.href))).json();
    const bin = atob(j.b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, { status: 200, headers: { "Content-Type": "application/octet-stream" } });
  }
  return nativeFetch(url, opts);
};
importScripts("worker.min.js");
