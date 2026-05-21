import { Clapperboard, ArrowRight } from "lucide-react";

const TOOLS = [
  {
    href: "/broll",
    name: "B-Roll Finder",
    description:
      "Transformez un script en storyboard : plans de coupe, requêtes de recherche pour les banques de stock et export PDF.",
    Icon: Clapperboard,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <header className="text-center">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white">
            <Clapperboard size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Boîte à outils
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Vos outils de production vidéo, réunis au même endroit.
          </p>
        </header>

        <div className="mx-auto mt-12 w-full max-w-md space-y-4">
          {TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <tool.Icon size={22} />
              </div>
              <h2 className="text-lg font-semibold">{tool.name}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {tool.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                Ouvrir l&apos;outil
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </a>
          ))}
        </div>

        <footer className="mt-20 text-center text-xs text-slate-400">
          Accès à l&apos;outil protégé par mot de passe.
        </footer>
      </main>
    </div>
  );
}
