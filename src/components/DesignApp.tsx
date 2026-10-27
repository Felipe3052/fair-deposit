"use client";

import { useState } from "react";
import AgentSteps, { type AgentStep } from "./AgentSteps";
import ShoppingListView, { type ShoppingListData } from "./ShoppingList";
import FurnitureSelector, { type FurnitureChoice } from "./FurnitureSelector";

interface RoomAnalysis {
  roomType: string;
  dimensionsEstimate: string;
  currentFurniture: string[];
  colorPalette: string[];
  lighting: string;
  styleNotes: string;
}

interface BudgetPlan {
  totalChf: number;
  allocation: { category: string; maxChf: number; share: number }[];
}

const STYLES = [
  "Skandinavisch",
  "Modern",
  "Minimalistisch",
  "Boho",
  "Industrial",
  "Japandi",
];

const MODEL_BADGES = ["Muse Spark", "Muse Image", "SAM 3.1"];

export default function DesignApp() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [budget, setBudget] = useState(2000);
  const [changeRequest, setChangeRequest] = useState("");
  const [furnitureSelection, setFurnitureSelection] = useState<FurnitureChoice[]>([]);
  const [furnitureStatus, setFurnitureStatus] = useState<"idle" | "running" | "ready" | "error">("idle");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [redesign, setRedesign] = useState("");
  const [list, setList] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState("");

  function onFile(nextFile: File | null) {
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setRedesign("");
    setList(null);
    setSteps([]);
    setAnalysis(null);
    setError("");
    setStatus("idle");
    setFurnitureSelection([]);
    setFurnitureStatus("idle");
  }

  async function run() {
    if (!file || status === "running") return;
    if (furnitureStatus !== "ready" || !furnitureSelection.some((item) => item.action === "replace")) {
      setError("Erkenne zuerst die Möbel mit SAM und markiere mindestens ein Möbelstück zum Ersetzen.");
      return;
    }
    setStatus("running");
    setError("");
    setSteps([]);
    setAnalysis(null);
    setBudgetPlan(null);
    setRedesign("");
    setList(null);

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("style", style);
      form.append("budgetChf", String(budget));
      form.append("changeRequest", changeRequest.trim());
      form.append("furnitureSelection", JSON.stringify(furnitureSelection));
      const response = await fetch("/api/design", { method: "POST", body: form });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      const handleFrame = (frame: string) => {
        const line = frame.trim();
        if (!line.startsWith("data:")) return;
        const event = JSON.parse(line.slice(5).trim());
        switch (event.type) {
          case "step":
            setSteps((current) => [
              ...current,
              {
                tool: event.tool,
                summary: event.summary,
                at: new Date().toISOString(),
              },
            ]);
            break;
          case "analysis":
            setAnalysis(event.data);
            break;
          case "budgetPlan":
            setBudgetPlan(event.data);
            break;
          case "image":
            setRedesign(event.dataUrl);
            break;
          case "list":
            setList(event.data);
            break;
          case "done":
            receivedDone = true;
            setRedesign((current) => current || event.data.redesignImageUrl || "");
            setList((current) => current ?? event.data.shoppingList ?? null);
            setStatus("done");
            break;
          case "error":
            throw new Error(event.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        frames.forEach(handleFrame);
      }
      if (buffer.trim()) handleFrame(buffer);
      if (!receivedDone) {
        throw new Error("Der Design-Stream wurde vor dem Abschluss beendet.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("error");
    }
  }

  const running = status === "running";
  const statusLabel =
    status === "running"
      ? "Entwurf entsteht"
      : status === "done"
        ? "Entwurf fertig"
        : status === "error"
          ? "Aktion nötig"
          : "Bereit für dein Foto";

  return (
    <main className="min-h-screen bg-[#f4f2eb] text-[#202821]">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#d9ded4] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#264b3a] text-lg text-white shadow-sm">
              <span aria-hidden="true">✳</span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#526657]">
                Raumgefühl
              </p>
              <p className="text-xs text-[#748077]">AI interior studio</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#d9ded4] bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[#526657] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7b9b72]" />
            Meta Global AI Hackathon
          </div>
        </header>

        <div className="mt-9 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          <section className="space-y-6">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#788778]">
                Dein persönliches Interior-Konzept
              </p>
              <h1 className="font-serif text-4xl leading-[1.06] tracking-tight text-[#26352a] sm:text-5xl">
                Ein Zuhause,<br className="hidden sm:block" /> das zu dir passt.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[#667168] sm:text-base">
                Teile dein Raumfoto und deine Wünsche. Muse entwirft ein neues
                Raumgefühl und verbindet die Idee mit echten Produkten.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#e0e3db] bg-white p-5 shadow-[0_18px_50px_-36px_rgba(34,55,41,0.45)] sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#7c897e]">
                    Der Start
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#27362c]">
                    Dein Design-Briefing
                  </h2>
                </div>
                <span className="rounded-full bg-[#eff3ec] px-3 py-1 text-[11px] font-semibold text-[#55705b]">
                  4 Schritte
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34453a]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1e9] text-[11px] text-[#59745d]">
                      01
                    </span>
                    Raumfoto
                  </label>
                  <label className="group relative flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#bdc9bd] bg-[#f8f8f4] text-center transition hover:border-[#68836b] hover:bg-[#f2f5ee]">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="Vorschau des hochgeladenen Raums"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-5 py-7">
                        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#58705e] shadow-sm ring-1 ring-[#e2e7de]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                            <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="block text-sm font-semibold text-[#35483a]">
                          Foto auswählen oder hier ablegen
                        </span>
                        <span className="mt-1 block text-xs text-[#7c887f]">
                          JPEG, PNG oder WebP · bis 10 MB
                        </span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => onFile(event.target.files?.[0] ?? null)}
                    />
                    {preview && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-[#202821]/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                        Foto ändern
                      </span>
                    )}
                  </label>
                  <FurnitureSelector
                    key={file ? `${file.name}-${file.size}-${file.lastModified}` : "no-file"}
                    file={file}
                    preview={preview}
                    onChange={setFurnitureSelection}
                    onStatusChange={setFurnitureStatus}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34453a]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1e9] text-[11px] text-[#59745d]">
                      02
                    </span>
                    Stilrichtung
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((option) => {
                      const selected = style === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setStyle(option)}
                          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-[#294b38] bg-[#294b38] text-white shadow-sm"
                              : "border-[#dfe4dc] bg-white text-[#536157] hover:border-[#9aab9b] hover:bg-[#f7f8f4]"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="change-request"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34453a]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1e9] text-[11px] text-[#59745d]">
                      03
                    </span>
                    Zusätzliche Wünsche <span className="font-normal text-[#7b887d]">(optional)</span>
                  </label>
                  <textarea
                    id="change-request"
                    value={changeRequest}
                    onChange={(event) => setChangeRequest(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Zum Beispiel: ein helles Sofa mit Stauraum oder einen pflegeleichten Teppich."
                    aria-describedby="change-request-help"
                    className="w-full resize-y rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4 py-3 text-sm leading-6 text-[#26352a] placeholder:text-[#89958a] focus:border-[#6d8a70] focus:outline-none focus:ring-4 focus:ring-[#edf2e9]"
                  />
                  <p id="change-request-help" className="mt-2 text-xs leading-5 text-[#758177]">
                    Deine SAM-Auswahl, Stilrichtung und Budget genügen. Ergänze hier Details, wenn du eine bestimmte Ausführung im Sinn hast.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="budget"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34453a]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1e9] text-[11px] text-[#59745d]">
                      04
                    </span>
                    Dein Budget
                  </label>
                  <div className="relative">
                    <input
                      id="budget"
                      type="number"
                      min={100}
                      max={100000}
                      step={100}
                      value={budget}
                      onChange={(event) => setBudget(Number(event.target.value) || 0)}
                      className="w-full rounded-2xl border border-[#dce3da] bg-[#fbfcf9] px-4 py-3 pr-16 text-base font-semibold tabular-nums text-[#26352a] focus:border-[#6d8a70] focus:outline-none focus:ring-4 focus:ring-[#edf2e9]"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[#78867b]">
                      CHF
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#758177]">
                    Preise stammen aus dem IKEA-US-Katalog und werden umgerechnet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={run}
                  disabled={!file || running || budget <= 0 || furnitureStatus !== "ready" || !furnitureSelection.some((item) => item.action === "replace")}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#294b38] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(28,63,43,0.8)] transition hover:-translate-y-0.5 hover:bg-[#203d2d] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#dce4dc] disabled:text-[#718073] disabled:shadow-none"
                >
                  {running ? "Dein Entwurf entsteht …" : furnitureStatus !== "ready" ? "Zuerst Möbel erkennen" : !furnitureSelection.some((item) => item.action === "replace") ? "Möbel zum Ersetzen auswählen" : "Raumdesign erstellen"}
                  {!running && (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" aria-hidden="true">
                      <path d="M3.5 10h13m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-[#efc7be] bg-[#fff4f0] px-4 py-3 text-sm text-[#9a493b]" role="alert">
                <p className="font-semibold">Der Entwurf konnte nicht fertiggestellt werden</p>
                <p className="mt-1 leading-5">{error}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 px-1">
              {MODEL_BADGES.map((model) => (
                <span
                  key={model}
                  className="rounded-full border border-[#dce1d8] bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[#67756a]"
                >
                  {model}
                </span>
              ))}
            </div>
          </section>

          <section className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#788778]">
                  Visualisierung & Auswahl
                </p>
                <h2 className="mt-1 font-serif text-3xl tracking-tight text-[#26352a] sm:text-4xl">
                  Dein Raum, neu gedacht.
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dce2d9] bg-white/75 px-3 py-2 text-xs font-medium text-[#607064]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    running
                      ? "animate-pulse bg-[#c18945]"
                      : status === "done"
                        ? "bg-[#6c9369]"
                        : status === "error"
                          ? "bg-[#b96552]"
                          : "bg-[#aab4a8]"
                  }`}
                />
                {statusLabel}
              </span>
            </div>

            {preview || redesign ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <figure className="overflow-hidden rounded-[24px] border border-[#e1e4dc] bg-white p-2 shadow-sm">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Dein Raum vorher"
                      className="aspect-[4/3] w-full rounded-[18px] object-cover"
                    />
                  )}
                  <figcaption className="flex items-center justify-between px-2 pb-1 pt-3 text-xs">
                    <span className="font-semibold text-[#39483c]">Ausgangsraum</span>
                    <span className="text-[#879187]">VORHER</span>
                  </figcaption>
                </figure>
                <figure className="overflow-hidden rounded-[24px] border border-[#e1e4dc] bg-white p-2 shadow-sm">
                  {redesign ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={redesign}
                      alt="Dein neu gestalteter Raum"
                      className="aspect-[4/3] w-full rounded-[18px] object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[18px] bg-[#f1f1e9] text-sm text-[#788578]">
                      {running ? "Das neue Raumgefühl entsteht …" : "Dein Entwurf erscheint hier"}
                    </div>
                  )}
                  <figcaption className="flex items-center justify-between px-2 pb-1 pt-3 text-xs">
                    <span className="font-semibold text-[#39483c]">Neues Konzept</span>
                    <span className="text-[#879187]">NACHHER</span>
                  </figcaption>
                </figure>
              </div>
            ) : (
              <div className="relative isolate flex min-h-[330px] overflow-hidden rounded-[28px] bg-[#dfe5d9] p-7 sm:min-h-[410px] sm:p-10">
                <div className="absolute -right-12 -top-16 -z-10 h-64 w-64 rounded-full bg-[#c5d0bf] blur-2xl" />
                <div className="absolute -bottom-24 left-1/3 -z-10 h-72 w-72 rounded-full bg-[#eee8d8] blur-3xl" />
                <div className="flex w-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-white/70 bg-white/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#5f725f]">
                      Raum für neue Ideen
                    </span>
                    <svg viewBox="0 0 48 48" className="h-10 w-10 text-[#71836f]" fill="none" aria-hidden="true">
                      <path d="M24 5.5v9m0 19v9m18.5-18.5h-9m-19 0h-9m31.58-13.08-6.36 6.36m-13.44 13.44-6.36 6.36m26.16 0-6.36-6.36M15.6 15.6l-6.36-6.36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="max-w-md pb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#657664]">
                      Dein Vorher & Nachher
                    </p>
                    <h3 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-[#2d4233] sm:text-4xl">
                      Aus deinem Raum<br /> wird deine Idee.
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-[#5d6d60]">
                      Lade ein Foto hoch und beschreibe, was bleiben darf und was
                      sich verändern soll. Dein Entwurf erscheint genau hier.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#607260]">
                    <span className="rounded-full bg-white/60 px-3 py-1.5">Raumanalyse</span>
                    <span className="rounded-full bg-white/60 px-3 py-1.5">KI-Redesign</span>
                    <span className="rounded-full bg-white/60 px-3 py-1.5">Echte Produkte</span>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="rounded-[24px] border border-[#e1e4dc] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#829083]">
                      Muse Spark hat erkannt
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[#2d3b31]">
                      {analysis.roomType.replaceAll("_", " ")}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#f1f4ed] px-3 py-1 text-xs text-[#667667]">
                    {analysis.lighting}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysis.currentFurniture.map((furniture) => (
                    <span key={furniture} className="rounded-full bg-[#f5f6f2] px-3 py-1.5 text-xs text-[#566459]">
                      {furniture}
                    </span>
                  ))}
                </div>
                <p className="mt-4 border-t border-[#edf0ea] pt-3 text-xs leading-5 text-[#7a857b]">
                  {analysis.styleNotes} · {analysis.dimensionsEstimate}
                </p>
              </div>
            )}

            {budgetPlan && (
              <details className="group rounded-[24px] border border-[#e1e4dc] bg-white p-5 shadow-sm sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold text-[#35443a]">Budget-Aufteilung</span>
                    <span className="mt-1 block text-xs text-[#7c887e]">Plan für {budgetPlan.totalChf.toLocaleString("de-CH")} CHF</span>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f4ed] text-[#5f765f] transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>
                <div className="mt-5 space-y-3">
                  {budgetPlan.allocation.map((allocation) => (
                    <div key={allocation.category} className="flex items-center gap-3 text-xs">
                      <span className="w-24 shrink-0 capitalize text-[#667267]">{allocation.category.replaceAll("_", " ")}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf0e9]">
                        <div className="h-full rounded-full bg-[#8da487]" style={{ width: `${allocation.share * 100}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right font-medium tabular-nums text-[#526154]">{allocation.maxChf.toFixed(0)} CHF</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="rounded-[24px] border border-[#e1e4dc] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#829083]">
                    Live-Einblick
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-[#2d3b31]">So entsteht dein Entwurf</h3>
                </div>
                <span className="rounded-full bg-[#f1f4ed] px-3 py-1.5 text-[11px] font-semibold text-[#657563]">
                  {steps.length ? `${steps.length} Schritte` : "Agent-Loop"}
                </span>
              </div>
              <AgentSteps steps={steps} running={running} />
            </div>

            {list && (
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#829083]">Passend zu deinem Konzept</p>
                    <h3 className="mt-1 font-serif text-2xl text-[#2d3b31]">Einkaufsliste</h3>
                  </div>
                  <span className="text-xs font-medium text-[#718074]">Echte IKEA-Produkte</span>
                </div>
                <ShoppingListView list={list} />
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 flex flex-col gap-2 border-t border-[#d9ded4] pt-5 text-[11px] leading-5 text-[#79847a] sm:flex-row sm:items-center sm:justify-between">
          <span>Produktdaten: IKEA US, Juli 2025 · USD-Preise umgerechnet in CHF</span>
          <span>Ein Hackathon-Prototyp mit Meta Model API</span>
        </footer>
      </div>
    </main>
  );
}
