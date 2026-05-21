import { NextRequest, NextResponse } from "next/server";

/**
 * Protection par mot de passe (HTTP Basic Auth).
 *
 * Variables d'environnement (a configurer sur l'hebergeur) :
 *   - BASIC_AUTH_PASSWORD : le mot de passe (obligatoire pour activer la protection)
 *   - BASIC_AUTH_USER     : un identifiant (optionnel)
 *
 * Seul l'outil "/broll" et les routes "/api/..." sont proteges.
 * La page d'accueil "/" et tout le reste restent PUBLICS.
 * La decision est prise dans la fonction (le config.matcher seul n'est pas fiable).
 */
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isProtected =
    path === "/broll" ||
    path.startsWith("/broll/") ||
    path.startsWith("/api/");

  // Tout ce qui n'est pas l'outil ou son API est public (accueil compris).
  if (!isProtected) return NextResponse.next();

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

export const config = {
  matcher: ["/broll", "/broll/:path*", "/api/:path*"],
};
