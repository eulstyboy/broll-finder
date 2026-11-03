import { brand, projects } from "./_projects";
import Stats from "./_stats";

// Accueil « laboratoire » : un objet par projet, scroll à résistance. public/labo/logo.js anime le logo.
// Le rendu serveur affiche le premier projet et la liste complète ; public/labo/lab.js anime le reste.
// Ancien accueil conservé dans _landing.tsx (pour revenir en arrière, le réimporter dans [[...slug]]/page.tsx).

const pad = (n: number) => String(n).padStart(2, "0");

// Rayons de la vitrine, dans l'ordre d'affichage. Un projet sans section va dans « Outils ».
const SECTIONS = [
  { id: "outil", label: "Outils" },
  { id: "experience", label: "Expériences" },
  { id: "studio", label: "Le studio" },
  { id: "jeu", label: "Jeux" },
] as const;
const sectionRank = (id: string) => SECTIONS.findIndex((x) => x.id === id);
const isExternal = (href: string) => /^https?:\/\//.test(href);
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Logo d'eulst (E / chauve-souris) en pixel art, dans sa pose de repos sur eulst.fr (js/logo.js projeté
// X 27,1° · Y −19° · Z 0,9°) redessiné case par case : 17 × 17 sur ordinateur (34 px), 15 × 15 en mobile (30 px),
// soit 2 px CSS par case aux deux tailles. Le favicon (app/icon.svg) et la face du cube reprennent la grille 16 × 16.
const LOGO_17 = "M7 0h1v1H7zM4 1h4v1H4zM4 2h4v1H4zM2 3h6v1H2zM1 4h3v1H1zM6 4h1v1H6zM13 4h2v1H13zM3 5h1v1H3zM10 5h6v1H10zM2 6h4v1H2zM9 6h7v1H9zM1 7h4v1H1zM9 7h6v1H9zM1 8h4v1H1zM9 8h6v1H9zM0 9h16v1H0zM0 10h4v1H0zM6 10h11v1H6zM6 11h4v1H6zM6 12h4v1H6zM7 13h3v1H7zM7 14h2v1H7zM7 15h2v1H7zM7 16h1v1H7z";
const LOGO_15 = "M6 0h1v1H6zM4 1h3v1H4zM3 2h4v1H3zM1 3h3v1H1zM5 3h1v1H5zM2 4h1v1H2zM9 4h4v1H9zM2 5h1v1H2zM4 5h1v1H4zM7 5h7v1H7zM1 6h4v1H1zM8 6h5v1H8zM1 7h3v1H1zM8 7h5v1H8zM0 8h14v1H0zM0 9h3v1H0zM5 9h5v1H5zM12 9h3v1H12zM5 10h4v1H5zM6 11h3v1H6zM6 12h2v1H6zM6 13h2v1H6zM7 14h1v1H7z";

// Icônes de la navigation en pixels (grille 9 × 9), mêmes rôles que sur eulst.fr : à propos, contact, liens.
const ICON_ABOUT = "M3 0h3v1H3zM2 1h5v1H2zM2 2h5v1H2zM3 3h3v1H3zM2 5h5v1H2zM1 6h7v1H1zM1 7h7v1H1zM1 8h7v1H1z";
const ICON_CONTACT = "M0 1h9v1H0zM0 2h2v1H0zM7 2h2v1H7zM0 3h1v1H0zM2 3h1v1H2zM6 3h1v1H6zM8 3h1v1H8zM0 4h1v1H0zM3 4h1v1H3zM5 4h1v1H5zM8 4h1v1H8zM0 5h1v1H0zM4 5h1v1H4zM8 5h1v1H8zM0 6h1v1H0zM8 6h1v1H8zM0 7h9v1H0z";
const ICON_LINKS = "M1 2h3v1H1zM5 2h3v1H5zM0 3h1v1H0zM4 3h1v1H4zM8 3h1v1H8zM0 4h1v1H0zM3 4h3v1H3zM8 4h1v1H8zM0 5h1v1H0zM4 5h1v1H4zM8 5h1v1H8zM1 6h3v1H1zM5 6h3v1H5z";

// Contact et liens : l'e-mail seul (pas de téléphone), LinkedIn et Instagram (pas les comptes « side »).
const EMAIL = "hello@eulst.fr";
const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/eulst" },
  { label: "Instagram", href: "https://www.instagram.com/eulst" },
];

// Intro sous la navigation : pourquoi cette page existe. L'à propos raconte le parcours, l'intro le dit en une phrase.
const INTRO = "Vous êtes dans le laboratoire d’eulst, motion designer qui expérimente ici ses idées d’objets interactifs.";
const ABOUT = [
  "Depuis toujours, ce qui m’attire, ce sont les supports qu’on manipule : les jeux, les interfaces, les objets qui répondent quand on les touche. Mon métier, c’est l’image en mouvement ; ici, c’est l’image qu’on fait bouger soi-même.",
  "Longtemps, ces idées sont restées dans des carnets. Depuis que l’IA m’a donné les moyens de les construire, eulst.app est mon terrain d’expérimentation : chaque cube est une idée devenue outil, expérience ou jeu.",
];

// three.js r128, servi par le site (même fichier que cdnjs, vérifié par son empreinte SRI) : lab.js le charge, la page le précharge.
const THREE_SRC = "/labo/three.r128.min.js";

export default function Lab() {
  const items = projects
    .filter((p) => p.visible && p.access === "public")
    .map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.category,
      url: p.href,
      desc: p.description,
      traits: p.traits ?? [],
      color: p.color ?? "#4d5eff",
      face: p.face ?? null,
      section: p.section ?? "outil",
      shelf: SECTIONS.find((x) => x.id === (p.section ?? "outil"))?.label ?? "",
    }))
    .sort((a, b) => sectionRank(a.section) - sectionRank(b.section));
  const shelves = SECTIONS.map((sec) => ({
    ...sec,
    first: items.findIndex((it) => it.section === sec.id),
    count: items.filter((it) => it.section === sec.id).length,
  })).filter((sec) => sec.count > 0);
  const first = items[0];
  const total = pad(items.length);
  const data = JSON.stringify(items).replace(/</g, "\\u003c");

  return (
    <div className="eulst-lab" id="lab" style={{ ["--item" as string]: first?.color }}>
      {/* Feuille statique propre à cet accueil, chargée seulement sur cette page. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/labo/lab.css?v=11" precedence="default" />
      {/* lab.js peut tourner avant que React ait repris la page (hydratation) : tout ce qu'il change doit être toléré par React.
          Textes changés : suppressHydrationWarning ; listes réécrites : contenu HTML brut ; canvas ajoutés : déjà présents dans le rendu serveur.
          Sinon React rejette la page (erreur 418), la redessine, et lab.js reste branché sur l'ancienne : plus de cube, menu en liens simples. */}
      <canvas id="gl" aria-hidden="true" />
      <canvas className="gl2d" aria-hidden="true" hidden />
      <div className="crt" aria-hidden="true" />

      <div className="hud" id="hud">
        {/* Navigation calquée sur eulst.fr : marque à gauche, liens au centre, à propos / contact / liens à droite. */}
        <header className="top">
          {/* Liens simples voulus : lab.js les intercepte (retour au premier projet) ; sans JS, la page se recharge. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="brand" id="brand" href="/" aria-label="eulst.app, retour au premier projet">
            <span className="mark" aria-hidden="true">
              <svg className="g17" viewBox="0 0 17 17" shapeRendering="crispEdges" focusable="false"><path d={LOGO_17} /></svg>
              <svg className="g15" viewBox="0 0 15 15" shapeRendering="crispEdges" focusable="false"><path d={LOGO_15} /></svg>
              <canvas className="anim" />
            </span>
            <span className="name">eulst.app</span>
          </a>
          <nav className="nav" aria-label="Navigation principale">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="nav-link lab-link" id="labLink" href="/" aria-current="page">laboratoire</a>
            <a className="nav-link" href={brand.website} target="_blank" rel="noopener">
              portfolio<span aria-hidden="true"> ↗</span><span className="sr"> (eulst.fr, nouvel onglet)</span>
            </a>
          </nav>
          <div className="tools">
            <button type="button" className="tool" id="aboutBtn" aria-haspopup="dialog" aria-controls="about">
              <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" focusable="false"><path d={ICON_ABOUT} /></svg>
              <span className="tool-label">à propos</span>
            </button>
            <div className="drop">
              <button type="button" className="tool" aria-expanded="false" aria-controls="menu-contact">
                <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" focusable="false"><path d={ICON_CONTACT} /></svg>
                <span className="tool-label">contact</span>
              </button>
              <div className="menu" id="menu-contact" hidden>
                <a className="menu-item copy" href={`mailto:${EMAIL}`} data-copy={EMAIL}>
                  <span>{EMAIL}</span><span className="copied" aria-hidden="true">copié</span>
                </a>
              </div>
            </div>
            <div className="drop">
              <button type="button" className="tool" aria-expanded="false" aria-controls="menu-liens">
                <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true" focusable="false"><path d={ICON_LINKS} /></svg>
                <span className="tool-label">liens</span>
              </button>
              <div className="menu" id="menu-liens" hidden>
                {LINKS.map((l) => (
                  <a className="menu-item" key={l.href} href={l.href} target="_blank" rel="noopener">
                    {l.label}<span aria-hidden="true"> ↗</span><span className="sr"> (nouvel onglet)</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="lede">
          <p className="intro">{INTRO}</p>
          <nav className="cats" aria-label="Catégories">
            {shelves.map((sec) => (
              <button type="button" key={sec.id} data-cat={sec.id} data-i={sec.first} aria-current={first?.section === sec.id ? "true" : "false"}>
                {sec.label}<span className="c">{sec.count}</span>
              </button>
            ))}
          </nav>
        </div>

        <ul className="index" id="index" aria-label="Projets">
          {items.map((p, i) => [
            i === 0 || items[i - 1].section !== p.section ? (
              <li className="sec" key={`sec-${p.section}`} aria-hidden="true">{p.shelf}</li>
            ) : null,
            <li key={p.id}>
              <a href={p.url} data-i={i} aria-current={i === 0 ? "true" : "false"} {...(isExternal(p.url) ? { target: "_blank", rel: "noopener" } : {})}>
                <span className="n">{pad(i + 1)}</span><span className="nm">{p.name}</span>
              </a>
            </li>,
          ])}
        </ul>

        {first && (
          <main className="slot" id="slot">
            <p className="eyebrow"><span className="no" id="no" suppressHydrationWarning>N°01</span><span id="kind" suppressHydrationWarning>{first.kind}</span></p>
            <h1 id="title" suppressHydrationWarning>{first.name}</h1>
            <a className="stage" id="stage" href={first.url} aria-label={`Ouvrir ${first.name}`} {...(isExternal(first.url) ? { target: "_blank", rel: "noopener" } : {})}>
              <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br brr" />
              <span className="prompt" id="prompt">▶ Ouvrir</span>
            </a>
            <p className="desc" id="desc" suppressHydrationWarning>{first.desc}</p>
            <ul className="traits" id="traits" dangerouslySetInnerHTML={{ __html: first.traits.map((t) => `<li>${esc(t)}</li>`).join("") }} />
          </main>
        )}

        <div className="gauge" id="gauge" aria-hidden="true">
          <span className="g-label" id="gPrev" suppressHydrationWarning>—</span>
          <div className="g-track"><i className="g-mid" /><b className="g-fill" id="gFill" /></div>
          <span className="g-label" id="gNext" suppressHydrationWarning>{items[1]?.name ?? "—"}</span>
        </div>

        <footer className="hint">
          <span id="hintMain" suppressHydrationWarning>Force la molette pour changer d’objet</span>
          <span className="end">
            {/* Chargement complet voulu : lab.js écoute la molette et le toucher sur toute la fenêtre. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="legal" href="/mentions-legales/">Mentions légales</a>
            <span className="keys"><kbd>↑</kbd> <kbd>↓</kbd> <kbd>1</kbd>–<kbd>{items.length}</kbd></span>
            <span className="count"><b id="cnt" suppressHydrationWarning>01</b>/{total}</span>
          </span>
        </footer>
        <p className="sr" aria-live="polite" id="live" dangerouslySetInnerHTML={{ __html: "" }} />
      </div>

      <dialog className="about" id="about" aria-labelledby="about-title">
        <div className="about-box">
          <button type="button" className="about-close" id="aboutClose" aria-label="Fermer">×</button>
          <p className="about-kicker">eulst.app</p>
          <h2 id="about-title">À propos</h2>
          {ABOUT.map((t) => <p key={t}>{t}</p>)}
          <p className="about-links">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener">
                {l.label}<span aria-hidden="true"> ↗</span><span className="sr"> (nouvel onglet)</span>
              </a>
            ))}
          </p>
        </div>
      </dialog>

      <script id="lab-data" type="application/json" dangerouslySetInnerHTML={{ __html: data }} />
      {/* three.js servi par le site (r128, identique au fichier de cdnjs) : préchargé pour que les cubes arrivent vite. */}
      <link rel="preload" href={THREE_SRC} as="script" />
      <script src="/labo/lab.js?v=9" async />
      <script src="/labo/logo.js?v=1" async />
      <Stats />
    </div>
  );
}
