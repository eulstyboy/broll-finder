import { brand, projects } from "./_projects";

// Accueil « laboratoire » : un objet par projet, scroll à résistance.
// Le rendu serveur affiche le premier projet et la liste complète ; public/labo/lab.js anime le reste.
// Ancien accueil conservé dans _landing.tsx (pour revenir en arrière, le réimporter dans [[...slug]]/page.tsx).

const pad = (n: number) => String(n).padStart(2, "0");

// Rayons de la vitrine, dans l'ordre d'affichage. Un projet sans section va dans « Outils ».
const SECTIONS = [
  { id: "studio", label: "Le studio" },
  { id: "outil", label: "Outils" },
  { id: "experience", label: "Expériences" },
  { id: "jeu", label: "Jeux" },
] as const;
const sectionRank = (id: string) => SECTIONS.findIndex((x) => x.id === id);
const isExternal = (href: string) => /^https?:\/\//.test(href);
// Prévisualisation Vercel seulement : jamais vrai en production ni sans Vercel (variable absente).
const isPreview = process.env.VERCEL_ENV === "preview";

// Logo d'eulst (E / chauve-souris) dans sa pose de repos sur eulst.fr, jamais à plat :
// tracé de eulst.fr (js/logo.js) projeté en perspective (X 27,1° · Y −19° · Z 0,9°) puis réduit en polygone.
const LOGO = "M53.4 44.3L47.7 38.6L46.9 37.5L46.6 36.2L46.8 35L47.3 33.8L48.4 32.7L49.6 32.1L72.9 24.2L74.6 23.9L76.7 23.9L78.5 24.2L80.2 24.8L94.2 31.6L95.1 32.2L95.7 33L95.9 34.1L95.4 35.3L88 40.6L86.4 42.2L85.5 44L85.2 45.5L85.3 46.6L85.6 48.3L86.1 49.4L87.5 51.6L88.8 52.9L98.7 61.8L99.8 63.4L100 65.1L99.6 66.1L98.9 66.8L98 67.2L96.7 67.3L71.3 61.9L69.7 61.8L68.2 62L66.8 62.4L65.5 63.1L63.7 64.6L62.6 66.3L49.4 97.4L48.7 98.2L47.8 98.7L46.7 98.9L45.8 98.6L44.4 97.5L43.4 95.8L34.3 62.1L33.7 60.5L32.6 59.5L31.6 58.9L30.5 58.7L29.3 58.8L28.4 59.2L27.4 59.8L20.2 66.1L19.2 66.7L18.1 67L17.1 67L1.2 64.2L0.6 63.9L0.2 63.4L0 62.5L0.2 61.3L7.1 43.3L8.5 41.6L15.1 36.7L16.1 35.6L16.6 34L16.5 32.9L15.8 31.9L5 24.4L4.8 23.7L5.3 22.6L6.4 21.8L21 16.3L23.1 14.9L24.2 13.7L24.8 12.7L26.7 4.2L27 3.6L27.7 3.1L28.5 2.8L29.2 2.8L32.8 5.5L34.2 5.7L35.7 5.6L37.3 5.2L38.5 4.5L43.6 0.4L44.7 0L45.7 0.1L50.7 5.2L51.2 6.3L51.2 7.5L50.6 9L41.1 23.9L40.2 24.8L39.1 25.4L37.7 25.8L36.5 25.7L35.1 24.9L31.1 20.3L30.2 20L29.2 20L27.3 20.7L26.4 21.5L25.7 22.4L19 36.9L18.8 38.2L19.1 38.8L19.5 39.2L20.8 39.3L28.1 35.7L29.7 35.3L30.9 35.3L32.1 35.7L33.1 36.3L33.7 37L34.2 38.1L34.4 39.4L34.3 40.8L33.9 41.9L33 43.2L27.7 49.8L27.3 50.7L27.2 51.8L27.5 52.7L28.1 53.3L28.9 53.6L50.2 52.3L51.6 52L52.4 51.6L53.4 50.8L54.2 49.8L54.7 48.7L54.8 47.4L54.6 46.3L54.2 45.3Z";

export default function Lab() {
  const items = projects
    .filter((p) => (p.visible || (isPreview && p.apercu)) && p.access === "public")
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
      <link rel="stylesheet" href="/labo/lab.css?v=8" precedence="default" />
      <canvas id="gl" aria-hidden="true" />
      <div className="crt" aria-hidden="true" />

      <div className="hud" id="hud">
        <header className="top">
          <a className="mark" href={brand.website} aria-label="eulst.fr, le portfolio d’eulst">
            <svg viewBox="-2 -2 104 103" aria-hidden="true" focusable="false"><path d={LOGO} /></svg>
          </a>
          <nav className="cats" aria-label="Catégories">
            {shelves.map((sec) => (
              <button type="button" key={sec.id} data-cat={sec.id} data-i={sec.first} aria-current={first?.section === sec.id ? "true" : "false"}>
                {sec.label}<span className="c">{sec.count}</span>
              </button>
            ))}
          </nav>
          <span className="count">Laboratoire · <b id="cnt">01</b>/{total}</span>
        </header>

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
            <p className="eyebrow"><span className="no" id="no">N°01</span><span id="kind">{first.kind}</span></p>
            <h1 id="title">{first.name}</h1>
            <a className="stage" id="stage" href={first.url} aria-label={`Ouvrir ${first.name}`} {...(isExternal(first.url) ? { target: "_blank", rel: "noopener" } : {})}>
              <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br brr" />
              <span className="prompt" id="prompt">▶ Ouvrir</span>
            </a>
            <p className="desc" id="desc">{first.desc}</p>
            <ul className="traits" id="traits">{first.traits.map((t) => <li key={t}>{t}</li>)}</ul>
          </main>
        )}

        <div className="gauge" id="gauge" aria-hidden="true">
          <span className="g-label" id="gPrev">—</span>
          <div className="g-track"><i className="g-mid" /><b className="g-fill" id="gFill" /></div>
          <span className="g-label" id="gNext">{items[1]?.name ?? "—"}</span>
        </div>

        <footer className="hint">
          <span id="hintMain">Force la molette pour changer d’objet</span>
          <span className="keys"><kbd>↑</kbd> <kbd>↓</kbd> <kbd>1</kbd>–<kbd>{items.length}</kbd></span>
        </footer>
        <p className="sr" aria-live="polite" id="live" />
      </div>

      <script id="lab-data" type="application/json" dangerouslySetInnerHTML={{ __html: data }} />
      <script src="/labo/lab.js?v=8" async />
    </div>
  );
}
