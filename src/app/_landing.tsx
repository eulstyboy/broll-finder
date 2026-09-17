import { brand, projects, type Project } from "./_projects";
import styles from "./landing.module.css";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.arrow}>
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Artwork({ kind, image }: { kind: Project["artwork"]; image?: string }) {
  if (image) {
    return (
      // Vignette décorative : le lien est déjà nommé par le titre du projet.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" width={560} height={300} decoding="async" className={styles.artwork} style={{ objectFit: "contain" }} />
    );
  }
  if (kind === "hofmann") {
    return (
      <svg viewBox="0 0 560 300" fill="none" aria-hidden="true" className={styles.artwork}>
        <g stroke="currentColor" strokeOpacity=".16" strokeWidth="1">
          {Array.from({ length: 35 }, (_, i) => <circle key={i} cx={100 + (i % 7) * 60} cy={30 + Math.floor(i / 7) * 60} r="23" />)}
        </g>
        <g className={styles.hofmannShape} fill="currentColor">
          <path d="M137 90a23 23 0 0 1 46 0v97h14a23 23 0 0 0 23-23V90a23 23 0 0 1 46 0v120a23 23 0 0 1-23 23h-83a23 23 0 0 1-23-23Z" />
          <path d="M294 90a23 23 0 0 1 23-23h83a23 23 0 0 1 0 46h-14a23 23 0 0 0-23 23v74a23 23 0 0 1-46 0V113h-23Z" />
          <circle cx="400" cy="210" r="23" />
        </g>
        <g stroke="currentColor" strokeOpacity=".3" strokeWidth="1">
          <path d="M24 24h10m-5-5v10M526 24h10m-5-5v10M24 276h10m-5-5v10M526 276h10m-5-5v10" />
        </g>
      </svg>
    );
  }
  if (kind === "broll") {
    return (
      <svg viewBox="0 0 560 300" fill="none" aria-hidden="true" className={styles.artwork}>
        <g stroke="currentColor" strokeOpacity=".15">
          <path d="M0 150h560M280 0v300" strokeDasharray="3 7" />
          <rect x="44" y="47" width="472" height="206" rx="2" />
        </g>
        <g className={styles.filmStrip}>
          <rect x="77" y="87" width="114" height="126" rx="3" fill="#dddcd5" />
          <rect x="207" y="87" width="146" height="126" rx="3" fill="#22231f" />
          <rect x="369" y="87" width="114" height="126" rx="3" fill="#dddcd5" />
          <path d="m77 184 43-47 25 26 20-17 26 38v29H77Z" fill="#b8b9ad" />
          <circle cx="154" cy="117" r="10" fill="#f6f5f1" />
          <path d="m269 132 29 18-29 18Z" fill="#f6f5f1" />
          <path d="M392 176v-30m11 42v-55m11 34v-38m11 55v-72m11 82v-54m11 37v-23m11 32v-48" stroke="#848779" strokeWidth="3" />
        </g>
        <g fill="currentColor" opacity=".5" fontFamily="monospace" fontSize="9">
          <text x="77" y="73">01 — PLAN</text><text x="207" y="73">02 — SÉQUENCE</text><text x="369" y="73">03 — RYTHME</text>
        </g>
        <path d="M77 234h406" stroke="currentColor" strokeOpacity=".2" />
        <path d="M207 230v8" stroke="currentColor" />
      </svg>
    );
  }
  return <svg viewBox="0 0 560 300" aria-hidden="true" className={styles.artwork}><circle cx="250" cy="150" r="65" fill="none" stroke="currentColor" /><rect x="250" y="85" width="130" height="130" fill="none" stroke="currentColor" /></svg>;
}

export default function Landing() {
  const visibleProjects = projects.filter((project) => project.visible);
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#projects">Aller aux projets</a>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href="/" className={styles.brand} aria-label="Eulst — accueil">
            {brand.logo ? (
              // Un fichier de logo configurable, sans contrainte de dimensions ou de format Next Image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="Eulst" className={styles.logo} />
            ) : <span className={styles.wordmark}>eulst<span className={styles.wordmarkDot}>.</span></span>}
            <span className={styles.brandLabel}>L’atelier numérique</span>
          </a>
          <a href={brand.website} className={styles.portfolioLink}>eulst.fr <Arrow diagonal /></a>
        </header>

        <main>
          <section className={styles.intro} aria-labelledby="intro-title">
            <div>
              <p className={styles.eyebrow}><span className={styles.statusDot} />Outils & explorations</p>
              <h1 id="intro-title" className={styles.title}>Des idées.<br /><span>À vous de jouer.</span></h1>
            </div>
            <div className={styles.introAside}>
              <p>Des outils faits maison pour dessiner,<br className={styles.desktopBreak} /> créer et essayer autrement.</p>
              <a href="#projects" className={styles.textLink}>Explorer les projets <span className={styles.downArrow}>↓</span></a>
            </div>
          </section>

          <section id="projects" className={styles.projects} aria-labelledby="projects-title" tabIndex={-1}>
            <div className={styles.sectionHeader}>
              <h2 id="projects-title">Les projets <span>({String(visibleProjects.length).padStart(2, "0")})</span></h2>
              <span className={styles.sectionNote}>Une collection en mouvement</span>
            </div>
            <div className={styles.projectGrid}>
              {visibleProjects.map((project, index) => (
                <article className={styles.project} key={project.id}>
                  <a href={project.href} className={styles.projectLink} aria-labelledby={`${project.id}-title ${project.id}-action`} aria-describedby={`${project.id}-description`}>
                    <div className={styles.visual}>
                      <span className={styles.projectNumber}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.badge}>{project.access === "private" ? "Accès privé" : "Accès libre"}</span>
                      <Artwork kind={project.artwork} image={project.image} />
                      <span className={styles.visualCaption}>{project.artwork === "hofmann" ? "De la contrainte naît la forme." : project.artwork === "broll" ? "Chaque plan commence par une idée." : "Une nouvelle piste à explorer."}</span>
                    </div>
                    <div className={styles.projectBody}>
                      <p className={styles.category}>{project.category}</p>
                      <div className={styles.projectHeading}><h3 id={`${project.id}-title`}>{project.name}</h3><span className={styles.circleButton}><Arrow /></span></div>
                      <p id={`${project.id}-description`} className={styles.description}>{project.description}</p>
                      <span id={`${project.id}-action`} className={styles.actionLabel}>{project.access === "private" ? "Ouvrir avec mon code" : "Ouvrir l’outil"} <span aria-hidden="true">↗</span></span>
                    </div>
                  </a>
                </article>
              ))}
            </div>
            <p className={styles.nextNote}><span aria-hidden="true">+</span> D’autres idées prennent forme. Elles arriveront ici.</p>
          </section>
        </main>

        <footer className={styles.footer}>
          <p>Imaginé par <a href={brand.website}>eulst</a>.</p>
          <a href={brand.website} className={styles.footerLink}>Voir mon univers <Arrow diagonal /></a>
        </footer>
      </div>
    </div>
  );
}
