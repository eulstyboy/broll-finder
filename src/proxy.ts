import { NextRequest, NextResponse } from "next/server";

/**
 * Protection par mot de passe (HTTP Basic Auth).
 *
 * Configurez dans les variables d'environnement de l'hebergeur :
 *   - BASIC_AUTH_PASSWORD : le mot de passe (obligatoire pour activer la protection)
 *   - BASIC_AUTH_USER     : un identifiant (optionnel ; si absent, tout identifiant est accepte)
 *
 * Si BASIC_AUTH_PASSWORD n'est pas defini (developpement local), l'acces reste libre.
 *
 * Seul l'outil B-Roll Finder (/broll) et ses routes API (/api/...) sont proteges.
 * La page d'accueil ("/") reste publique (voir "matcher" ci-dessous).
 */
export function proxy(req: NextRequest) {
  const expectedPass = process.env.BASIC_AUTH_PASSWORD || "";
  const expectedUser = process.env.BASIC_AUTH_USER || "";

  // Pas de mot de passe configure -> acces libre (utile en local).
  if (!expectedPass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header && header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (pass === expectedPass && (!expectedUser || user === expectedUser)) {
        return NextResponse.next();
      }
    } catch {
      // En-tete d'authentification invalide : on redemande le mot de passe.
    }
  }

  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="B-Roll Finder", charset="UTF-8"',
    },
  });
}

// Protege l'outil et son API ; la page d'accueil et les fichiers statiques restent publics.
export const config = {
  matcher: ["/broll", "/broll/:path*", "/api/:path*"],
};
