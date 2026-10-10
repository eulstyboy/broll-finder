import { brand, projects } from "./_projects";

// Accueil « laboratoire » : un objet par projet, scroll à résistance.
// Le rendu serveur affiche le premier projet et la liste complète ; public/labo/lab.js anime le reste.
// Ancien accueil conservé dans _landing.tsx (pour revenir en arrière, le réimporter dans [[...slug]]/page.tsx).

const pad = (n: number) => String(n).padStart(2, "0");

// Rayons de la vitrine, dans l'ordre d'affichage. Un projet sans section va dans « Outils ».
const SECTIONS = [
  { id: "outil", label: "Outils" },
  { id: "experience", label: "Expériences" },
  { id: "jeu", label: "Jeux" },
] as const;
const sectionRank = (id: string) => SECTIONS.findIndex((x) => x.id === id);
const isExternal = (href: string) => /^https?:\/\//.test(href);

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
      <link rel="stylesheet" href="/labo/lab.css?v=7" precedence="default" />
      <canvas id="gl" aria-hidden="true" />
      <div className="crt" aria-hidden="true" />

      <div className="hud" id="hud">
        <header className="top">
          <a className="mark" href={brand.website}>eulst<span>.app</span></a>
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
              <li className="sec" key={`sec-${p.section}`} aria-hidden="true">{SECTIONS.find((x) => x.id === p.section)?.label}</li>
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
      <script src="/labo/lab.js?v=7" async />
    </div>
  );
}
