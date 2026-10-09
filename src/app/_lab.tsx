import { brand, projects } from "./_projects";

// Accueil « laboratoire » : un objet par projet, scroll à résistance.
// Le rendu serveur affiche le premier projet et la liste complète ; public/labo/lab.js anime le reste.
// Ancien accueil conservé dans _landing.tsx (pour revenir en arrière, le réimporter dans [[...slug]]/page.tsx).

const pad = (n: number) => String(n).padStart(2, "0");
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
    }));
  const first = items[0];
  const total = pad(items.length);
  const data = JSON.stringify(items).replace(/</g, "\\u003c");

  return (
    <div className="eulst-lab" id="lab" style={{ ["--item" as string]: first?.color }}>
      {/* Feuille statique propre à cet accueil, chargée seulement sur cette page. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/labo/lab.css?v=5" precedence="default" />
      <canvas id="gl" aria-hidden="true" />
      <div className="crt" aria-hidden="true" />

      <div className="hud" id="hud">
        <header className="top">
          <a className="mark" href={brand.website}>eulst<span>.app</span></a>
          <span className="count">Laboratoire · <b id="cnt">01</b>/{total}</span>
        </header>

        <ul className="index" id="index" aria-label="Projets">
          {items.map((p, i) => (
            <li key={p.id}>
              <a href={p.url} data-i={i} aria-current={i === 0 ? "true" : "false"} {...(isExternal(p.url) ? { target: "_blank", rel: "noopener" } : {})}>
                <span className="n">{pad(i + 1)}</span><span className="nm">{p.name}</span>
              </a>
            </li>
          ))}
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
      <script src="/labo/lab.js?v=5" async />
    </div>
  );
}
