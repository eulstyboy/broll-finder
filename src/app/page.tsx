"use client";

import { useState, useRef } from "react";
import {
  Loader2,
  FileUp,
  Video,
  Camera,
  Clapperboard,
  Sparkles,
  Download,
  FileArchive,
  Clipboard,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import JSZip from "jszip";

// --- Constantes ---
const PLATFORMS = [
  { id: "pexels", name: "Pexels" },
  { id: "pixabay", name: "Pixabay" },
  { id: "shutterstock", name: "Shutterstock" },
  { id: "getty", name: "Getty" },
  { id: "adobe", name: "Adobe Stock" },
  { id: "artlist", name: "Artlist" },
];

const MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5-20251101",
  "claude-haiku-4-5-20251001",
];
const ROLES = [
  { id: "motion", name: "Motion Designer" },
  { id: "doc", name: "Documentaire" },
  { id: "commercial", name: "Publicité" },
  { id: "experimental", name: "Expérimental" },
];

// --- Helpers ---
const splitTokens = (q: string): string[] =>
  q
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const getSearchUrl = (
  platformId: string,
  query: string,
  type: "video" | "photo"
) => {
  const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const qEncoded = encodeURIComponent(cleanQuery);
  const qPlus = cleanQuery.replace(/\s+/g, "+");
  const qDash = cleanQuery.replace(/\s+/g, "-");

  if (type === "video") {
    switch (platformId) {
      case "pexels": return `https://www.pexels.com/search/videos/${qEncoded}/`;
      case "pixabay": return `https://pixabay.com/videos/search/${qEncoded}/`;
      case "shutterstock": return `https://www.shutterstock.com/video/search/${qDash}`;
      case "getty": return `https://www.gettyimages.fr/search/2/film?phrase=${qEncoded}`;
      case "adobe": return `https://stock.adobe.com/search/video?k=${qEncoded}`;
      case "artlist": return `https://artlist.io/stock-footage/search?q=${qPlus}&terms=${qPlus}`;
      default: return "#";
    }
  } else {
    switch (platformId) {
      case "pexels": return `https://www.pexels.com/search/${qEncoded}/`;
      case "pixabay": return `https://pixabay.com/images/search/${qEncoded}/`;
      case "shutterstock": return `https://www.shutterstock.com/search/${qDash}`;
      case "getty": return `https://www.gettyimages.fr/search/2/image?phrase=${qEncoded}`;
      case "adobe": return `https://stock.adobe.com/search/images?k=${qEncoded}`;
      case "artlist": return `https://artlist.io/stock-footage/search?q=${qPlus}&terms=${qPlus}`;
      default: return "#";
    }
  }
};

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

type AnalyzeResult = { sentence: string; queries: string[] };
type PdfMeta = {
  projectTitle: string;
  client: string;
  date: string;
  duration: string;
};

export default function Home() {
  const [script, setScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "pexels",
    "pixabay",
    "shutterstock",
  ]);
  const [selectedImages, setSelectedImages] = useState<Record<number, string>>({});
  const [mediaType, setMediaType] = useState<"video" | "photo">("video");
  const [mockups, setMockups] = useState<
    Record<string, { file?: File; localUrl?: string; remoteUrl?: string; base64?: string }>
  >({});
  const [role, setRole] = useState("motion");
  const [model, setModel] = useState("claude-sonnet-4-6");

  // Mots-cles desactives par requete : cle "pIdx-qIdx" -> indices desactives
  const [disabledTokens, setDisabledTokens] = useState<Record<string, number[]>>({});

  // Popup d'informations du storyboard
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfMeta, setPdfMeta] = useState<PdfMeta>({
    projectTitle: "",
    client: "",
    date: "",
    duration: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) setScript(data.text);
      else alert(data.error || "Aucun texte trouve dans ce fichier.");
    } catch {
      alert("Erreur lors de la lecture du fichier.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!script.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, role, model }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.error || "Erreur lors de l'analyse du script.");
        return;
      }
      setResults(data.results || []);
      setMockups({});
      setSelectedImages({});
      setDisabledTokens({});
    } catch {
      alert("Erreur d'analyse : probleme de connexion ou de serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalMockupChange = async (
    phraseIdx: number,
    queryIdx: number,
    file: File
  ) => {
    const key = `${phraseIdx}-${queryIdx}`;
    const base64 = await getBase64(file);
    setMockups((prev) => ({ ...prev, [key]: { file, base64 } }));
    setSelectedImages((prev) => ({
      ...prev,
      [phraseIdx]: results[phraseIdx].queries[queryIdx],
    }));
  };

  const handleRemoteUrlChange = (
    phraseIdx: number,
    queryIdx: number,
    remoteUrl: string
  ) => {
    const key = `${phraseIdx}-${queryIdx}`;
    setMockups((prev) => ({ ...prev, [key]: { ...prev[key], remoteUrl } }));
    if (remoteUrl.trim()) {
      setSelectedImages((prev) => ({
        ...prev,
        [phraseIdx]: results[phraseIdx].queries[queryIdx],
      }));
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent,
    phraseIdx: number,
    queryIdx: number
  ) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleLocalMockupChange(phraseIdx, queryIdx, file);
          e.preventDefault();
        }
      }
    }
  };

  // --- Gestion des mots-cles ---
  const isTokenActive = (key: string, idx: number) =>
    !(disabledTokens[key] || []).includes(idx);

  const toggleToken = (key: string, idx: number) => {
    setDisabledTokens((prev) => {
      const cur = prev[key] || [];
      const next = cur.includes(idx)
        ? cur.filter((x) => x !== idx)
        : [...cur, idx];
      return { ...prev, [key]: next };
    });
  };

  // Requete effective : uniquement les mots-cles actifs
  const activeQuery = (pIdx: number, qIdx: number, q: string): string => {
    const key = `${pIdx}-${qIdx}`;
    const tokens = splitTokens(q);
    const active = tokens.filter((_, idx) => isTokenActive(key, idx));
    return (active.length > 0 ? active : tokens).join(", ");
  };

  // --- Export PDF : storyboard A4 paysage, grille 2x2 ---
  const exportPDF = async () => {
    if (results.length === 0) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF("l", "mm", "a4");
      const PAGE_W = 297;
      const PAGE_H = 210;
      const M = 12;
      const HEAD = 20;
      const GAP = 8;
      const COLS = 2;
      const ROWS = 2;
      const PER = COLS * ROWS;
      const HEADER_H = 9;
      const TEXT_H = 20;
      const cellW = (PAGE_W - M * 2 - GAP) / COLS;
      const cellH = (PAGE_H - M - HEAD - M - GAP) / ROWS;
      const imgBoxH = cellH - HEADER_H - TEXT_H;
      const totalPages = Math.ceil(results.length / PER);

      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const slot = i % PER;
        if (i > 0 && slot === 0) doc.addPage();

        // Bandeau de page (titre projet + infos)
        if (slot === 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          doc.setTextColor(15, 23, 42);
          doc.text(pdfMeta.projectTitle || "Storyboard de production", M, M + 6);

          const metaParts = [
            pdfMeta.client ? `Client : ${pdfMeta.client}` : "",
            pdfMeta.date ? `Date : ${pdfMeta.date}` : "",
            pdfMeta.duration ? `Durée : ${pdfMeta.duration}` : "",
          ].filter(Boolean);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          if (metaParts.length > 0) {
            doc.text(metaParts.join("     ·     "), M, M + 12);
          }
          doc.text(
            `Page ${Math.floor(i / PER) + 1}/${totalPages}`,
            PAGE_W - M,
            M + 6,
            { align: "right" }
          );
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(M, M + 16, PAGE_W - M, M + 16);
        }

        const col = slot % COLS;
        const row = Math.floor(slot / COLS);
        const x = M + col * (cellW + GAP);
        const y = M + HEAD + row * (cellH + GAP);

        // Bandeau d'en-tete : numero de plan, HORS de l'image
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cellW, HEADER_H, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(37, 99, 235);
        doc.text(`PLAN ${i + 1}`, x + 4, y + 6);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(x, y + HEADER_H, x + cellW, y + HEADER_H);

        // Zone image (letterbox sombre)
        const imgY = y + HEADER_H;
        doc.setFillColor(15, 23, 42);
        doc.rect(x, imgY, cellW, imgBoxH, "F");

        // Visuel correspondant a la requete SELECTIONNEE
        const selectedQuery = selectedImages[i];
        let mk: { base64?: string; remoteUrl?: string } | undefined;
        if (selectedQuery !== undefined) {
          const qIdx = results[i].queries.indexOf(selectedQuery);
          if (qIdx >= 0) mk = mockups[`${i}-${qIdx}`];
        }
        // Repli : premier visuel disponible pour ce plan
        if (!mk || (!mk.base64 && !mk.remoteUrl)) {
          const fk = Object.keys(mockups).find(
            (k) =>
              k.startsWith(`${i}-`) &&
              (mockups[k]?.base64 || mockups[k]?.remoteUrl)
          );
          if (fk) mk = mockups[fk];
        }
        const src = mk?.base64 || mk?.remoteUrl;

        let drawn = false;
        if (src) {
          const img = await loadImage(src);
          if (img && img.naturalWidth > 0) {
            const scale = Math.min(
              cellW / img.naturalWidth,
              imgBoxH / img.naturalHeight
            );
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const ox = x + (cellW - w) / 2;
            const oy = imgY + (imgBoxH - h) / 2;
            try {
              doc.addImage(img, "JPEG", ox, oy, w, h);
              drawn = true;
            } catch {
              drawn = false;
            }
          }
        }
        if (!drawn) {
          doc.setTextColor(120, 130, 150);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text("Aucun visuel", x + cellW / 2, imgY + imgBoxH / 2, {
            align: "center",
          });
        }

        // Bandeau texte : phrase du plan
        const ty = imgY + imgBoxH;
        doc.setFillColor(255, 255, 255);
        doc.rect(x, ty, cellW, TEXT_H, "F");
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(item.sentence, cellW - 8) as string[];
        const shown = lines.slice(0, 3);
        if (lines.length > 3 && shown[2]) {
          shown[2] = shown[2].slice(0, -2) + "...";
        }
        doc.text(shown, x + 4, ty + 6);

        // Contour de la case
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cellW, cellH, "S");
      }

      const safeName = (pdfMeta.projectTitle || "Storyboard")
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 60);
      doc.save(`${safeName}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportProductionZIP = async () => {
    const zip = new JSZip();
    const folder = zip.folder("B-ROLL_ASSETS");
    Object.keys(mockups).forEach((key) => {
      if (mockups[key]?.file)
        folder?.file(mockups[key].file!.name, mockups[key].file!);
    });
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "PRODUCTION.zip";
    link.click();
  };

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";
  const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">
              <Clapperboard size={18} />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight">
                B-Roll Finder
              </h1>
              <p className="text-xs text-slate-500">Du script au storyboard</p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPdfModalOpen(true)}
                disabled={isExporting}
                className={ghostBtn}
              >
                {isExporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} className="text-blue-600" />
                )}
                <span className="hidden sm:inline">Storyboard PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button onClick={exportProductionZIP} className={ghostBtn}>
                <FileArchive size={15} className="text-blue-600" />
                <span className="hidden sm:inline">Assets ZIP</span>
                <span className="sm:hidden">ZIP</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Script
                  </h2>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                  >
                    <FileUp size={13} /> Importer un fichier
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt"
                  />
                </div>
                <textarea
                  className="h-44 w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Collez votre script ici. Chaque phrase deviendra un plan de coupe..."
                />
                <p className="mt-2 text-right text-xs text-slate-400">
                  {wordCount} mot{wordCount > 1 ? "s" : ""}
                </p>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">
                  Parametres
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Style creatif</label>
                    <select
                      className={fieldClass}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Modele IA</label>
                    <select
                      className={fieldClass}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      {MODELS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Type de media</label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                    {(["video", "photo"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMediaType(t)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                          mediaType === t
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {t === "video" ? (
                          <Video size={14} />
                        ) : (
                          <Camera size={14} />
                        )}
                        {t === "video" ? "Video" : "Photo"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Plateformes ({selectedPlatforms.length})
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map((p) => {
                      const on = selectedPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setSelectedPlatforms((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((x) => x !== p.id)
                                : [...prev, p.id]
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            on
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !script.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isLoading ? "Analyse en cours..." : "Generer le storyboard"}
              </button>
            </div>
          </aside>

          <section className="lg:col-span-8">
            {results.length === 0 ? (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <Clapperboard size={26} />
                  </div>
                  <h3 className="font-semibold text-slate-700">
                    Votre storyboard apparaitra ici
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Collez un script, choisissez vos plateformes, puis lancez la
                    generation pour obtenir les plans de coupe et leurs requetes
                    de recherche.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h2 className="text-sm font-semibold text-slate-500">
                    {results.length} plan{results.length > 1 ? "s" : ""}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Astuce : cliquez sur un mot-cle pour l&apos;exclure de la
                    recherche.
                  </p>
                </div>

                {results.map((item, pIdx) => (
                  <article
                    key={pIdx}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                      <span className="mt-0.5 inline-grid h-6 shrink-0 place-items-center rounded-md bg-blue-600 px-2 text-xs font-bold tracking-wide text-white">
                        PLAN {pIdx + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {item.sentence}
                      </p>
                    </div>

                    <div className="space-y-2.5 p-4">
                      {item.queries.map((q, qIdx) => {
                        const isSelected = selectedImages[pIdx] === q;
                        const m = mockups[`${pIdx}-${qIdx}`];
                        const preview = m?.base64 || m?.remoteUrl;
                        const tkey = `${pIdx}-${qIdx}`;
                        return (
                          <div
                            key={qIdx}
                            onClick={() =>
                              setSelectedImages((prev) => ({
                                ...prev,
                                [pIdx]: q,
                              }))
                            }
                            onPaste={(e) => handlePaste(e, pIdx, qIdx)}
                            className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="grid aspect-video w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-slate-500">
                                {preview ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={preview}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="px-1 text-center">
                                    <Clipboard
                                      size={14}
                                      className="mx-auto mb-0.5"
                                    />
                                    <span className="text-[9px] uppercase tracking-wide">
                                      Ctrl+V
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {splitTokens(q).map((tok, tIdx) => {
                                    const active = isTokenActive(tkey, tIdx);
                                    return (
                                      <button
                                        key={tIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleToken(tkey, tIdx);
                                        }}
                                        title={
                                          active
                                            ? "Cliquer pour exclure ce mot-cle"
                                            : "Cliquer pour reactiver ce mot-cle"
                                        }
                                        className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                                          active
                                            ? "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            : "border border-dashed border-slate-300 bg-white text-slate-400 line-through hover:text-slate-500"
                                        }`}
                                      >
                                        {tok}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {PLATFORMS.filter((p) =>
                                    selectedPlatforms.includes(p.id)
                                  ).map((p) => (
                                    <a
                                      key={p.id}
                                      href={getSearchUrl(
                                        p.id,
                                        activeQuery(pIdx, qIdx, q),
                                        mediaType
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                                    >
                                      {p.name}
                                    </a>
                                  ))}
                                </div>

                                <input
                                  type="text"
                                  placeholder="Ou collez une URL de vignette..."
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    handleRemoteUrlChange(
                                      pIdx,
                                      qIdx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-2 py-1 text-[11px] text-slate-600 outline-none transition-colors focus:border-blue-500 focus:bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {pdfModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onClick={() => setPdfModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Informations du storyboard
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ces informations apparaitront en tete du PDF. Tous les champs
                  sont optionnels.
                </p>
              </div>
              <button
                onClick={() => setPdfModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Titre du projet</label>
                <input
                  className={fieldClass}
                  value={pdfMeta.projectTitle}
                  onChange={(e) =>
                    setPdfMeta((m) => ({ ...m, projectTitle: e.target.value }))
                  }
                  placeholder="Ex : Campagne de printemps"
                />
              </div>
              <div>
                <label className={labelClass}>Client</label>
                <input
                  className={fieldClass}
                  value={pdfMeta.client}
                  onChange={(e) =>
                    setPdfMeta((m) => ({ ...m, client: e.target.value }))
                  }
                  placeholder="Ex : Studio Lumiere"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    className={fieldClass}
                    value={pdfMeta.date}
                    onChange={(e) =>
                      setPdfMeta((m) => ({ ...m, date: e.target.value }))
                    }
                    placeholder="Ex : 21/05/2026"
                  />
                </div>
                <div>
                  <label className={labelClass}>Duree</label>
                  <input
                    className={fieldClass}
                    value={pdfMeta.duration}
                    onChange={(e) =>
                      setPdfMeta((m) => ({ ...m, duration: e.target.value }))
                    }
                    placeholder="Ex : 2 min 30"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPdfModalOpen(false)}
                className={ghostBtn}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setPdfModalOpen(false);
                  await exportPDF();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Download size={15} /> Exporter le PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
