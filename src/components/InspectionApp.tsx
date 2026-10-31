"use client";

import { useMemo, useRef, useState } from "react";
import AgentSteps from "@/components/AgentSteps";
import BeforeAfter from "@/components/BeforeAfter";
import LetterPanel from "@/components/LetterPanel";
import { buildLetter } from "@/lib/letter";
import FindingList from "@/components/FindingList";
import PhotoEvidence from "@/components/PhotoEvidence";
import ShareTable, { COMPONENT_LABELS, type LineFix } from "@/components/ShareTable";
import { preparePhoto, readEventStream } from "@/lib/client-image";
import { ageFromInstalledYear, computeShares, type ShareInput } from "@/lib/fair-share";
import { getRulePack, type RulePack } from "@/lib/rules";
import { COMPONENT_TYPES, type AgentStep, type ComponentType, type Finding, type InspectionEvent, type InspectionReport, type ShareLine, type ShareTotals } from "@/lib/agent/types";

interface Photo { id: string; room: string; kind: "move_out" | "move_in"; dataUrl: string; width: number; height: number }
interface Claim { id: string; description: string; amount: string }
interface ComponentAge { key: string; component: ComponentType; variant: string; installedYear: string }

type Phase = "setup" | "running" | "done" | "error";

const DEMO = {
  photos: [
    { id: "demo-wall", file: "living-room-wall.jpg", room: "Living room — wall", kind: "move_out" as const },
    { id: "demo-floor", file: "living-room-floor.jpg", room: "Living room — floor", kind: "move_out" as const },
    { id: "demo-back-wall", file: "living-room-back-wall.jpg", room: "Living room — back wall", kind: "move_out" as const },
    { id: "demo-overview", file: "living-room-overview.jpg", room: "Living room — overview", kind: "move_out" as const },
    // Einzug: Boden schon zerkratzt, Wände sauber → Parkett-Forderung entfällt
    { id: "demo-move-in", file: "living-room-move-in.jpg", room: "Living room", kind: "move_in" as const },
  ],
  claims: [
    { id: "c1", description: "Repaint living room walls (hole, drawings)", amount: "900" },
    { id: "c2", description: "Sand and reseal parquet floor", amount: "1200" },
    { id: "c3", description: "Replace kitchen countertop", amount: "800" },
  ],
  components: [
    { component: "wall_paint" as const, installedYear: "2021" },
    { component: "parquet_finish" as const, installedYear: "2018" },
  ],
};

const inputClass = "w-full rounded-xl border border-[#dfe3da] bg-white px-3 py-2 text-sm text-[#2c3a30] outline-none focus:border-[#6f866e] focus:ring-2 focus:ring-[#6f866e]/20";
const labelClass = "mb-1 block text-xs font-medium text-[#66746a]";

const ROOM_SUGGESTIONS = ["Living room", "Kitchen", "Bathroom", "Bedroom", "Hallway", "Kids' room", "Office", "Balcony", "Storage room"];

/** Kamera-/Messenger-Namen (IMG_1234, PXL_2026…, WhatsApp Image …) sagen nichts über den Raum → leer lassen und nachfragen. */
const GENERIC_FILE_NAME = /^(img|image|dsc[nf]?|dcim|pxl|mvimg|photo|pic|picture|screenshot|screen shot|whatsapp image|signal|telegram|wp|bild|foto|scan|capture|snapchat)(?=[\s_.-]*(\d|$))|^[\d\s_.-]+$|\d{6,}|^[0-9a-f-]{16,}$/i;

function roomFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  if (GENERIC_FILE_NAME.test(base)) return "";
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").slice(0, 60);
}

/** Raffung der aufgezeichneten Demo-Fahrt (echte Laufzeit ≈ 50–80 s); per ?speed=1 (Echtzeit) bis ?speed=10 übersteuerbar, z. B. fürs Video. */
const REPLAY_SPEED = 3;

/** Vercel nimmt max. 4.5 MB pro Request an; etwas Reserve für Header. */
const MAX_PAYLOAD_BYTES = 4.3 * 1024 * 1024;

let uid = 0;
const nextKey = (prefix: string) => `${prefix}${++uid}`;

export default function InspectionApp({ configuredModels }: { configuredModels: InspectionReport["models"] }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [rulePackId, setRulePackId] = useState<RulePack["id"]>("ch");
  const [currency, setCurrency] = useState("CHF");
  const [tenancyStart, setTenancyStart] = useState("2021-04-01");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [components, setComponents] = useState<ComponentAge[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [findings, setFindings] = useState<Record<string, Finding>>({});
  const [share, setShare] = useState<{ lines: ShareLine[]; totals: ShareTotals } | null>(null);
  const [verification, setVerification] = useState<{ passed: boolean; issues: string[] } | null>(null);
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const [runMoveOut, setRunMoveOut] = useState("");
  const [focusPhotoId, setFocusPhotoId] = useState<string | null>(null);
  const [replay, setReplay] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pack = getRulePack(rulePackId);
  const photoRooms = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p.room])), [photos]);
  const findingList = Object.values(findings);
  const models = report?.models ?? configuredModels;
  const activeFinding = activeId ? findings[activeId] : undefined;

  // Welche Fotos untersucht der Agent gerade? Abgeleitet aus dem letzten (noch laufenden) Schritt.
  const scanningIds = useMemo(() => {
    const last = phase === "running" ? steps[steps.length - 1] : undefined;
    if (!last) return new Set<string>();
    const moveOut = photos.filter((p) => p.kind === "move_out").map((p) => p.id);
    const damaged = [...new Set(Object.values(findings).filter((f) => f.classification === "damage" && f.status !== "rejected").map((f) => f.photoId))];
    if (last.tool === "prepare" || (last.tool === "inspect_photos" && last.summary.startsWith("Inspecting"))) return new Set(moveOut);
    if (last.tool === "zoom_region" && last.summary.startsWith("Zooming")) return new Set(moveOut.filter((id) => last.summary.endsWith(` ${id}`)));
    if ((last.tool === "segment_findings" && last.summary.startsWith("Creating")) || (last.tool === "review_findings" && last.summary.startsWith("Skeptical"))) return new Set(damaged);
    if (last.tool === "compare_move_in" && last.summary.startsWith("Comparing")) return new Set([...damaged, ...photos.filter((p) => p.kind === "move_in").map((p) => p.id)]);
    return new Set<string>();
  }, [phase, steps, photos, findings]);
  const activeMoveOut = activeFinding ? photos.find((p) => p.id === activeFinding.photoId) : undefined;

  /** Befund wählen (Sidebar) → Auswahl + Sprung zur Foto-Evidence, nicht zum Brief. */
  function selectFinding(id: string) {
    setActiveId(id);
    const photoId = findings[id]?.photoId;
    if (photoId) setTimeout(() => document.getElementById(`photo-${photoId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  async function addFiles(files: FileList | File[]) {
    setLoadingPhotos(true);
    try {
      const prepared = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map(async (file) => {
        const p = await preparePhoto(file);
        return { id: nextKey("p"), room: roomFromFileName(file.name), kind: "move_out" as const, ...p };
      }));
      setPhotos((prev) => [...prev, ...prepared].slice(0, 12));
      setFocusPhotoId(prepared.find((p) => !p.room)?.id ?? null);
    } finally {
      setLoadingPhotos(false);
    }
  }

  async function loadDemo() {
    setLoadingPhotos(true);
    try {
      const prepared = await Promise.all(DEMO.photos.map(async ({ id, file, room, kind }) => {
        const blob = await (await fetch(`/demo/${file}`)).blob();
        return { id, room, kind, ...(await preparePhoto(blob)) };
      }));
      setPhotos(prepared);
      setClaims(DEMO.claims.map((c) => ({ ...c })));
      setComponents(DEMO.components.map((c) => ({ key: nextKey("k"), variant: "", ...c })));
      setRulePackId("ch");
      setCurrency("CHF");
      setTenancyStart("2021-04-01");
      setMoveOutDate("2026-10-31");
    } finally {
      setLoadingPhotos(false);
    }
  }

  function changePack(id: RulePack["id"]) {
    setRulePackId(id);
    setCurrency(id === "ch" ? "CHF" : "USD");
    setComponents((prev) => prev.map((c) => ({ ...c, variant: "" })));
  }

  /** Nachträge nach der Analyse (Einbaujahr, Material, Bauteil): gleiche reine Rechnung wie im Agent, nur im Browser. */
  function recompute(lines: ShareLine[], comps: ComponentAge[]) {
    const inputs: ShareInput[] = lines.map((l) => {
      const c = comps.find((x) => x.component === l.component);
      return {
        claimId: l.claimId, claimDescription: l.claimDescription, claimedAmount: l.claimedAmount,
        component: l.component, variant: c?.variant || null,
        findingClassifications: l.findingClassifications, findingIds: l.findingIds,
        ageYears: c?.installedYear.length === 4 ? ageFromInstalledYear(Number(c.installedYear), runMoveOut) : null,
      };
    });
    return computeShares(inputs, pack.lifespans, currency);
  }

  function fixLine(index: number, fix: LineFix) {
    if (!share) return;
    const line = share.lines[index];
    const component = fix.component ?? line.component;
    let comps = components;
    if (fix.installedYear !== undefined || fix.variant !== undefined || !comps.some((c) => c.component === component)) {
      const existing = comps.find((c) => c.component === component);
      const next: ComponentAge = {
        key: existing?.key ?? nextKey("k"), component,
        variant: fix.variant ?? existing?.variant ?? "",
        installedYear: fix.installedYear ?? existing?.installedYear ?? "",
      };
      comps = existing ? comps.map((c) => (c.key === existing.key ? next : c)) : [...comps, next];
      setComponents(comps);
    }
    setShare(recompute(share.lines.map((l, i) => (i === index ? { ...l, component } : l)), comps));
    setEdited(true);
  }

  function resetRun(effectiveMoveOut: string, isReplay: boolean) {
    setPhase("running");
    setSteps([]);
    setFindings({});
    setShare(null);
    setEdited(false);
    setRunMoveOut(effectiveMoveOut);
    setVerification(null);
    setReport(null);
    setError(null);
    setActiveId(null);
    setReplay(isReplay);
  }

  /** Ein SSE-Event in den UI-Zustand übernehmen; true = Lauf beendet. */
  function handleEvent(ev: InspectionEvent): boolean {
    if (ev.type === "step") setSteps((prev) => [...prev, { tool: ev.tool, summary: ev.summary, at: new Date().toISOString() }]);
    else if (ev.type === "finding") setFindings((prev) => ({ ...prev, [ev.data.id]: ev.data }));
    else if (ev.type === "share") setShare({ lines: ev.lines, totals: ev.totals });
    else if (ev.type === "verification") setVerification({ passed: ev.passed, issues: ev.issues });
    else if (ev.type === "done") {
      setReport(ev.data);
      setVerification(ev.data.verification);
      if (ev.data.lines.length) setShare({ lines: ev.data.lines, totals: ev.data.totals });
      setPhase("done");
      return true;
    } else if (ev.type === "error") {
      setError(ev.message);
      setPhase("error");
      return true;
    }
    return false;
  }

  /**
   * Aufgezeichneter echter Lauf (scripts/record-demo-run.mjs) für Video und Live-Demo:
   * gleiche Events, zeitlich gerafft, ohne API-Wartezeit. In der UI als Replay gekennzeichnet.
   */
  async function playRecording() {
    await loadDemo();
    try {
      const recording = (await (await fetch("/demo/recorded-run.json")).json()) as { moveOutDate: string; events: { t: number; event: InspectionEvent }[] };
      resetRun(recording.moveOutDate, true);
      const speed = Math.min(10, Math.max(1, Number(new URLSearchParams(window.location.search).get("speed")) || REPLAY_SPEED));
      let last = 0;
      for (const { t, event } of recording.events) {
        await new Promise((r) => setTimeout(r, Math.min(2200 * (REPLAY_SPEED / speed), Math.max(0, (t - last) / speed))));
        last = t;
        if (handleEvent(event)) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  async function run() {
    const effectiveMoveOut = moveOutDate || new Date().toISOString().slice(0, 10); // leer = heute (erst im Handler, nicht im Prerender)
    resetRun(effectiveMoveOut, false);
    try {
      const payload = JSON.stringify({
        rulePack: rulePackId,
        currency,
        tenancyStart,
        moveOutDate: effectiveMoveOut,
        components: components
          .filter((c) => c.installedYear.length === 4) // unvollständige Jahre ignorieren statt Request scheitern lassen
          .map((c) => ({ component: c.component, installedYear: Number(c.installedYear), ...(c.variant ? { variant: c.variant } : {}) })),
        photos: photos.map((p, i) => ({ id: p.id, room: p.room.trim().slice(0, 60) || `Photo ${i + 1}`, kind: p.kind, imageBase64: p.dataUrl })),
        landlordClaims: claims
          .filter((c) => c.description.trim() && c.amount !== "" && Number.isFinite(Number(c.amount)))
          .map((c) => ({ id: c.id, description: c.description.trim().slice(0, 200), amount: Number(c.amount) })),
      });
      // Hosting-Grenze (Vercel: 4.5 MB pro Request) verständlich melden statt kryptisch scheitern
      if (payload.length > MAX_PAYLOAD_BYTES) {
        throw new Error(`These photos are too large for one inspection (${(payload.length / 1024 / 1024).toFixed(1)} MB, max. ${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)} MB). Remove a few photos and try again.`);
      }
      const res = await fetch("/api/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const details = body.details ? Object.entries(body.details as Record<string, string[]>).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "";
        throw new Error(`${body.error ?? `Request failed (${res.status})`}${details ? ` — ${details}` : ""}`);
      }
      let finished = false;
      await readEventStream<InspectionEvent>(res, (ev) => {
        if (handleEvent(ev)) finished = true;
      });
      if (!finished) throw new Error("The connection ended before the report was complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const unnamed = photos.filter((p) => !p.room.trim()).length;
  const canRun = photos.length > 0 && unnamed === 0 && tenancyStart !== "" && !loadingPhotos && phase !== "running";
  const showResults = phase !== "setup";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- kleines statisches Asset */}
          <img src="/mascot/avatar.webp" alt="" width={40} height={40} className="h-10 w-10 rounded-2xl ring-1 ring-black/5" />
          <div>
            <h1 className="text-lg font-semibold leading-tight text-[#202821]">Fair Deposit</h1>
            <p className="text-xs text-[#758177]">Move-out inspection agent — tenant side</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-[#4d6450]">
          {/* Nach einem Lauf die tatsächlich verwendeten Modelle, vorher die konfigurierten (Open Weights per Env-Flag) */}
          {models.agent !== models.vision ? (
            <>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">{models.agent.split("/").pop()} · agent</span>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">{models.vision.split("/").pop()} · vision</span>
            </>
          ) : (
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">{models.agent.split("/").pop()} · agent + vision</span>
          )}
          <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">{models.segmentation} · evidence masks</span>
          {models.openWeights && <span className="rounded-full bg-[#294b38] px-2.5 py-1 text-white">open weights via Baseten</span>}
        </div>
      </header>

      {!showResults && (
        <section className="mb-10">
          <div className="flex items-center gap-8">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6f866e]">Move-out inspection agent · for tenants</p>
              <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight text-[#202821] sm:text-5xl">
                Your landlord wants <span className="text-[#b13d0c] line-through decoration-[3px]">CHF 2,900</span>.
                <br />
                You owe <span className="text-[#294b38]">CHF 247.50</span>.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-[#5f6d63]">
                Fair Deposit inspects your move-out photos, proves every damage with a pixel mask, checks your move-in photos
                for damage that was already there, and computes what you fairly owe from each component&apos;s remaining lifespan.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={playRecording} disabled={loadingPhotos} className="rounded-2xl bg-[#294b38] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#21402f] disabled:opacity-50">
                  ▶ Watch the agent inspect an apartment
                </button>
                <a href="#setup" className="rounded-2xl bg-white px-5 py-3 text-base font-medium text-[#294b38] ring-1 ring-black/10 hover:bg-[#fafbf8]">
                  Use my own photos ↓
                </a>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- statisches Maskottchen mit transparentem Hintergrund */}
            <img src="/mascot/inspector.webp" alt="Fair Deposit inspector mascot" width={240} height={240} className="hidden h-60 w-60 shrink-0 md:block" />
          </div>
          <ol className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Find", "Muse Spark scans every photo, zooms into corners and separates normal wear from real damage."],
              ["2", "Prove", "SAM 3.1 masks each damage pixel by pixel, a second look rejects false alarms, move-in photos reveal what was already there."],
              ["3", "Compute", "Code — never the model — applies official lifespans. You get a fair share and a reply letter with evidence."],
            ].map(([n, title, text]) => (
              <li key={n} className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#294b38] text-xs font-bold text-white">{n}</span>
                  <span className="font-semibold text-[#2c3a30]">{title}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f6d63]">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {phase === "setup" && (
        <div id="setup" className="grid scroll-mt-6 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Fotos */}
          <section className="rounded-3xl bg-white/70 p-5 ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[#2c3a30]">1 · Move-out photos</h3>
              <div className="flex items-center gap-4">
                <button type="button" onClick={loadDemo} disabled={loadingPhotos} className="text-sm font-medium text-[#294b38] underline underline-offset-4 disabled:opacity-50">
                  Load demo apartment
                </button>
                <button type="button" onClick={playRecording} disabled={loadingPhotos} className="rounded-full bg-[#294b38] px-3 py-1 text-sm font-medium text-white disabled:opacity-50">
                  ▶ Watch demo run
                </button>
              </div>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInput.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d5dbd0] bg-[#fafbf8] px-4 py-8 text-center text-sm text-[#66746a] hover:border-[#6f866e]"
            >
              <span className="font-medium text-[#2c3a30]">{loadingPhotos ? "Preparing photos …" : "Drop photos here or click to upload"}</span>
              <span className="mt-1 text-xs">Overview shots plus close-ups of anything the landlord mentions · max. 12</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </div>
            {photos.length > 0 && (
              <>
              <datalist id="room-suggestions">
                {ROOM_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
              {unnamed > 0 && <p className="mt-4 text-xs text-[#8a6a08]">Name {unnamed === 1 ? "the highlighted photo" : `the ${unnamed} highlighted photos`} — the room ends up in the report and the letter.</p>}
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- lokale data URL */}
                      <img src={p.dataUrl} alt={p.room} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, kind: x.kind === "move_out" ? "move_in" : "move_out" } : x)))}
                        className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${p.kind === "move_in" ? "bg-[#2f6fd6] text-white" : "bg-white/90 text-[#35443a]"}`}
                        title="Switch between move-in and move-out photo"
                      >
                        {p.kind === "move_in" ? "Move-in" : "Move-out"}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 p-2">
                      <input
                        value={p.room}
                        onChange={(e) => setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, room: e.target.value } : x)))}
                        placeholder="Which room?"
                        list="room-suggestions"
                        autoFocus={p.id === focusPhotoId}
                        maxLength={60}
                        className={`min-w-0 flex-1 rounded-md px-1.5 py-1 text-xs text-[#2c3a30] outline-none focus:bg-[#f4f6f1] ${p.room.trim() ? "" : "bg-[#fbf3d9] ring-1 ring-[#c99a12]/60 placeholder:text-[#8a6a08]"}`}
                        aria-label="Room"
                      />
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} className="px-1 text-xs text-[#9aa39b] hover:text-[#b13d0c]" aria-label={`Remove ${p.room}`}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </section>

          <div className="space-y-6">
            {/* Mietverhältnis */}
            <section className="rounded-3xl bg-white/70 p-5 ring-1 ring-black/5">
              <h3 className="mb-4 font-semibold text-[#2c3a30]">2 · Tenancy & rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2">
                  <span className={labelClass}>Lifespan rules</span>
                  <select value={rulePackId} onChange={(e) => changePack(e.target.value as RulePack["id"])} className={inputClass}>
                    <option value="ch">Switzerland — joint lifespan table (HEV / MV)</option>
                    <option value="generic">Other country — generic estimate</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Move-in</span>
                  <input type="date" value={tenancyStart} onChange={(e) => setTenancyStart(e.target.value)} className={inputClass} />
                </label>
                <label>
                  <span className={labelClass}>Move-out <span className="font-normal">(empty = today)</span></span>
                  <input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} className={inputClass} />
                </label>
              </div>
              <div className="mt-4">
                {components.length > 0 && (
                  <div className="mb-2 flex items-center justify-between">
                    <span className={labelClass}>When was it last renewed? (needed for the residual value)</span>
                  </div>
                )}
                <ul className="space-y-2">
                  {components.map((c) => {
                    const variants = pack.lifespans.filter((l) => l.component === c.component && l.variant);
                    return (
                      <li key={c.key} className="grid grid-cols-[1fr_1fr_5rem_auto] gap-2">
                        <select value={c.component} onChange={(e) => setComponents((prev) => prev.map((x) => (x.key === c.key ? { ...x, component: e.target.value as ComponentType, variant: "" } : x)))} className={inputClass} aria-label="Component">
                          {COMPONENT_TYPES.filter((t) => t !== "other").map((t) => <option key={t} value={t}>{COMPONENT_LABELS[t]}</option>)}
                        </select>
                        <select value={c.variant} onChange={(e) => setComponents((prev) => prev.map((x) => (x.key === c.key ? { ...x, variant: e.target.value } : x)))} className={inputClass} aria-label="Material" disabled={!variants.length}>
                          <option value="">{pack.lifespans.find((l) => l.component === c.component && !l.variant)?.label ?? "Standard"}</option>
                          {variants.map((v) => <option key={v.variant} value={v.variant}>{v.label}</option>)}
                        </select>
                        <input value={c.installedYear} onChange={(e) => setComponents((prev) => prev.map((x) => (x.key === c.key ? { ...x, installedYear: e.target.value.replace(/\D/g, "").slice(0, 4) } : x)))} placeholder="Year" inputMode="numeric" className={inputClass} aria-label="Year installed" />
                        <button type="button" onClick={() => setComponents((prev) => prev.filter((x) => x.key !== c.key))} className="px-1 text-xs text-[#9aa39b] hover:text-[#b13d0c]" aria-label="Remove">✕</button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={() => setComponents((prev) => [...prev, { key: nextKey("k"), component: "wall_paint", variant: "", installedYear: "" }])} className="mt-2 text-sm font-medium text-[#294b38]">
                  + Add component
                </button>
              </div>
            </section>

            {/* Forderungen */}
            <section className="rounded-3xl bg-white/70 p-5 ring-1 ring-black/5">
              <h3 className="mb-1 font-semibold text-[#2c3a30]">3 · Landlord&apos;s claims <span className="font-normal text-[#849084]">(optional)</span></h3>
              <p className="mb-3 text-xs text-[#758177]">From the move-out report or invoice. Amounts in {currency}.</p>
              <ul className="space-y-2">
                {claims.map((c) => (
                  <li key={c.id} className="grid grid-cols-[1fr_6rem_auto] gap-2">
                    <input value={c.description} onChange={(e) => setClaims((prev) => prev.map((x) => (x.id === c.id ? { ...x, description: e.target.value } : x)))} placeholder="e.g. Repaint bedroom" className={inputClass} aria-label="Claim" />
                    <input value={c.amount} onChange={(e) => setClaims((prev) => prev.map((x) => (x.id === c.id ? { ...x, amount: e.target.value.replace(/[^\d.]/g, "") } : x)))} placeholder="Amount" inputMode="decimal" className={inputClass} aria-label="Amount" />
                    <button type="button" onClick={() => setClaims((prev) => prev.filter((x) => x.id !== c.id))} className="px-1 text-xs text-[#9aa39b] hover:text-[#b13d0c]" aria-label="Remove claim">✕</button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setClaims((prev) => [...prev, { id: nextKey("c"), description: "", amount: "" }])} className="mt-2 text-sm font-medium text-[#294b38]">
                + Add claim
              </button>
            </section>

            <button type="button" onClick={run} disabled={!canRun} className="w-full rounded-2xl bg-[#294b38] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#21402f] disabled:cursor-not-allowed disabled:opacity-40">
              Start inspection
            </button>
            {!canRun && !loadingPhotos && phase === "setup" && (
              <p className="mt-2 text-center text-xs text-[#758177]">
                {photos.length === 0
                  ? "Add at least one photo to start."
                  : unnamed > 0
                    ? "Name every photo — the room name ends up in the report and the letter."
                    : "Add a tenancy start date to run the inspection."}
              </p>
            )}
          </div>
        </div>
      )}

      {showResults && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- kleines statisches Asset */}
              <img src="/mascot/avatar.webp" alt="" width={56} height={56} className={`h-14 w-14 shrink-0 rounded-2xl ring-1 ring-black/5 ${phase === "running" ? "animate-bounce [animation-duration:1.6s]" : ""}`} />
              <div>
              {phase === "running" && steps.length > 0 && (
                <p className="mb-1 w-fit max-w-xl rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-sm text-[#35443a] ring-1 ring-black/5">{steps[steps.length - 1].summary}</p>
              )}
              <h2 className="text-2xl font-semibold text-[#202821]">
                {phase === "running" ? "Inspecting your apartment …" : phase === "done" ? "Inspection report" : "Inspection stopped"}
                {replay && <span className="ml-3 rounded-full bg-[#eef2eb] px-2 py-0.5 align-middle text-xs font-medium text-[#4d6450]">replay of a recorded run</span>}
              </h2>
              {verification && (
                <p className={`mt-1 text-sm ${verification.passed ? "text-[#3f6b47]" : "text-[#8a6a08]"}`}>
                  {verification.passed ? "✓ Verified: every damage finding has a mask and a second look, totals recomputed in code." : `Not fully verified: ${verification.issues[0] ?? ""}`}
                </p>
              )}
              </div>
            </div>
            {phase !== "running" && (
              <button type="button" onClick={() => setPhase("setup")} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#294b38] ring-1 ring-black/10 hover:bg-[#fafbf8] print:hidden">
                ← Edit inputs
              </button>
            )}
          </div>

          {error && <div className="rounded-2xl bg-[#fdebe2] p-4 text-sm text-[#8f2f08]">{error}</div>}

          {share && (
            <ShareTable
              lines={share.lines}
              totals={share.totals}
              ruleSource={{ name: pack.name, isEstimate: pack.isEstimate, title: pack.source?.title ?? null, url: pack.source?.url ?? null }}
              lifespans={pack.lifespans}
              componentInputs={Object.fromEntries(components.map((c) => [c.component, { installedYear: c.installedYear, variant: c.variant }]))}
              onFix={phase === "done" ? fixLine : undefined}
              edited={edited}
            />
          )}

          {activeFinding?.moveIn && activeMoveOut && (
            <BeforeAfter
              finding={activeFinding}
              moveOut={activeMoveOut}
              moveIn={photos.find((p) => p.id === activeFinding.moveIn?.moveInPhotoId) ?? null}
              onClose={() => setActiveId(null)}
            />
          )}

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] print:block">
            <div className="grid content-start gap-4 sm:grid-cols-2 print:grid-cols-2">
              {photos.map((p) => (
                <div key={p.id} id={`photo-${p.id}`}>
                  <PhotoEvidence
                    key={p.id}
                    photo={{ ...p, room: p.kind === "move_in" ? `${p.room} · move-in` : p.room }}
                    findings={findingList.filter((f) => f.photoId === p.id)}
                    activeId={activeId}
                    onSelect={setActiveId}
                    scanning={scanningIds.has(p.id)}
                  />
                </div>
              ))}
            </div>
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start print:hidden">
              <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
                <h3 className="mb-4 font-semibold text-[#2c3a30]">Agent steps</h3>
                <AgentSteps steps={steps} running={phase === "running"} />
              </section>
              <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
                <h3 className="mb-2 font-semibold text-[#2c3a30]">Findings</h3>
                <FindingList findings={findingList} photoRooms={photoRooms} activeId={activeId} onSelect={selectFinding} />
              </section>
              {report && (
                <p className="text-xs text-[#849084]">{report.modelCalls} model calls · {report.disclaimer}</p>
              )}
            </aside>
          </div>

          {phase === "done" && share && (
            <LetterPanel
              key={`${report?.id}-${share.totals.tenantPays}-${share.totals.openLines}`}
              initialText={buildLetter({
                lines: share.lines,
                totals: share.totals,
                findings: findingList,
                photoRooms,
                rule: { name: pack.name, isEstimate: pack.isEstimate, title: pack.source?.title ?? null, url: pack.source?.url ?? null },
                moveOutDate: runMoveOut,
              })}
            />
          )}
        </div>
      )}
    </div>
  );
}
