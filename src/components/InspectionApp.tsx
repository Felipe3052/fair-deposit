"use client";

import { useMemo, useRef, useState } from "react";
import AgentSteps from "@/components/AgentSteps";
import FindingList from "@/components/FindingList";
import PhotoEvidence from "@/components/PhotoEvidence";
import ShareTable from "@/components/ShareTable";
import { preparePhoto, readEventStream } from "@/lib/client-image";
import { getRulePack, type RulePack } from "@/lib/rules";
import { COMPONENT_TYPES, type AgentStep, type ComponentType, type Finding, type InspectionEvent, type InspectionReport, type ShareLine, type ShareTotals } from "@/lib/agent/types";

interface Photo { id: string; room: string; dataUrl: string; width: number; height: number }
interface Claim { id: string; description: string; amount: string }
interface ComponentAge { key: string; component: ComponentType; variant: string; installedYear: string }

type Phase = "setup" | "running" | "done" | "error";

const COMPONENT_LABELS: Record<ComponentType, string> = {
  wall_paint: "Wall paint", wallpaper: "Wallpaper", carpet: "Carpet", laminate: "Laminate", vinyl: "Vinyl / linoleum",
  parquet_finish: "Parquet sealing", parquet_solid: "Parquet / wood floor", tiles: "Tiles", kitchen_counter: "Kitchen countertop",
  door: "Door", window: "Window", bathroom_fixture: "Bathroom fixture", appliance: "Appliance", other: "Other",
};

const DEMO = {
  photos: [
    { file: "living-room-wall.jpg", room: "Living room — wall" },
    { file: "living-room-floor.jpg", room: "Living room — floor" },
    { file: "living-room-back-wall.jpg", room: "Living room — back wall" },
    { file: "living-room-overview.jpg", room: "Living room — overview" },
  ],
  claims: [
    { description: "Repaint living room walls (hole, drawings)", amount: "900" },
    { description: "Sand and reseal parquet floor", amount: "1200" },
    { description: "Replace kitchen countertop", amount: "800" },
  ],
  components: [
    { component: "wall_paint" as const, installedYear: "2021" },
    { component: "parquet_finish" as const, installedYear: "2018" },
  ],
};

const inputClass = "w-full rounded-xl border border-[#dfe3da] bg-white px-3 py-2 text-sm text-[#2c3a30] outline-none focus:border-[#6f866e] focus:ring-2 focus:ring-[#6f866e]/20";
const labelClass = "mb-1 block text-xs font-medium text-[#66746a]";

let uid = 0;
const nextKey = (prefix: string) => `${prefix}${++uid}`;

export default function InspectionApp() {
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
  const fileInput = useRef<HTMLInputElement>(null);

  const pack = getRulePack(rulePackId);
  const photoRooms = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p.room])), [photos]);
  const findingList = Object.values(findings);

  async function addFiles(files: FileList | File[]) {
    setLoadingPhotos(true);
    try {
      const prepared = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map(async (file) => {
        const p = await preparePhoto(file);
        return { id: nextKey("p"), room: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), ...p };
      }));
      setPhotos((prev) => [...prev, ...prepared].slice(0, 12));
    } finally {
      setLoadingPhotos(false);
    }
  }

  async function loadDemo() {
    setLoadingPhotos(true);
    try {
      const prepared = await Promise.all(DEMO.photos.map(async ({ file, room }) => {
        const blob = await (await fetch(`/demo/${file}`)).blob();
        return { id: nextKey("p"), room, ...(await preparePhoto(blob)) };
      }));
      setPhotos(prepared);
      setClaims(DEMO.claims.map((c) => ({ id: nextKey("c"), ...c })));
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

  async function run() {
    setPhase("running");
    setSteps([]);
    setFindings({});
    setShare(null);
    setVerification(null);
    setReport(null);
    setError(null);
    setActiveId(null);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rulePack: rulePackId,
          currency,
          tenancyStart,
          moveOutDate: moveOutDate || new Date().toISOString().slice(0, 10), // leer = heute (erst im Handler, nicht im Prerender)
          components: components
            .filter((c) => c.installedYear)
            .map((c) => ({ component: c.component, installedYear: Number(c.installedYear), ...(c.variant ? { variant: c.variant } : {}) })),
          photos: photos.map((p) => ({ id: p.id, room: p.room, kind: "move_out", imageBase64: p.dataUrl })),
          landlordClaims: claims
            .filter((c) => c.description.trim() && c.amount !== "")
            .map((c) => ({ id: c.id, description: c.description.trim(), amount: Number(c.amount) })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      let finished = false;
      await readEventStream<InspectionEvent>(res, (ev) => {
        if (ev.type === "step") setSteps((prev) => [...prev, { tool: ev.tool, summary: ev.summary, at: new Date().toISOString() }]);
        else if (ev.type === "finding") setFindings((prev) => ({ ...prev, [ev.data.id]: ev.data }));
        else if (ev.type === "share") setShare({ lines: ev.lines, totals: ev.totals });
        else if (ev.type === "verification") setVerification({ passed: ev.passed, issues: ev.issues });
        else if (ev.type === "done") {
          finished = true;
          setReport(ev.data);
          setVerification(ev.data.verification);
          if (ev.data.lines.length) setShare({ lines: ev.data.lines, totals: ev.data.totals });
          setPhase("done");
        } else if (ev.type === "error") {
          finished = true;
          setError(ev.message);
          setPhase("error");
        }
      });
      if (!finished) throw new Error("The connection ended before the report was complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const canRun = photos.length > 0 && !loadingPhotos && phase !== "running";
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
          <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">muse-spark-1.3 · agent + vision</span>
          <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/5">sam-3.1 · evidence masks</span>
        </div>
      </header>

      {!showResults && (
        <section className="mb-8 flex items-center gap-6">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#202821] sm:text-4xl">What do you really owe at move-out?</h2>
            <p className="mt-3 text-[#5f6d63]">
              Upload photos of your apartment and your landlord&apos;s claims. The agent separates normal wear from real damage,
              proves every finding with a mask, and computes your fair share from the component&apos;s remaining value.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- statisches Maskottchen, weisser Hintergrund per multiply ausgeblendet */}
          <img src="/mascot/inspector.webp" alt="Fair Deposit inspector mascot" width={180} height={180} className="hidden h-44 w-44 shrink-0 mix-blend-multiply sm:block" />
        </section>
      )}

      {phase === "setup" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Fotos */}
          <section className="rounded-3xl bg-white/70 p-5 ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[#2c3a30]">1 · Move-out photos</h3>
              <button type="button" onClick={loadDemo} disabled={loadingPhotos} className="text-sm font-medium text-[#294b38] underline underline-offset-4 disabled:opacity-50">
                Load demo apartment
              </button>
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
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- lokale data URL */}
                    <img src={p.dataUrl} alt={p.room} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center gap-1 p-2">
                      <input
                        value={p.room}
                        onChange={(e) => setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, room: e.target.value } : x)))}
                        className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-xs text-[#2c3a30] outline-none focus:bg-[#f4f6f1]"
                        aria-label="Room"
                      />
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} className="px-1 text-xs text-[#9aa39b] hover:text-[#b13d0c]" aria-label={`Remove ${p.room}`}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
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
                <div className="mb-2 flex items-center justify-between">
                  <span className={labelClass}>When was it last renewed? (needed for the residual value)</span>
                </div>
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
              </h2>
              {verification && (
                <p className={`mt-1 text-sm ${verification.passed ? "text-[#3f6b47]" : "text-[#8a6a08]"}`}>
                  {verification.passed ? "✓ Verified: every damage finding has a mask and a second look, totals recomputed in code." : `Not fully verified: ${verification.issues[0] ?? ""}`}
                </p>
              )}
              </div>
            </div>
            {phase !== "running" && (
              <button type="button" onClick={() => setPhase("setup")} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#294b38] ring-1 ring-black/10 hover:bg-[#fafbf8]">
                ← Edit inputs
              </button>
            )}
          </div>

          {error && <div className="rounded-2xl bg-[#fdebe2] p-4 text-sm text-[#8f2f08]">{error}</div>}

          {share && <ShareTable lines={share.lines} totals={share.totals} ruleSource={{ name: pack.name, isEstimate: pack.isEstimate, title: pack.source?.title ?? null, url: pack.source?.url ?? null }} />}

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              {photos.map((p) => (
                <PhotoEvidence key={p.id} photo={p} findings={findingList.filter((f) => f.photoId === p.id)} activeId={activeId} onSelect={setActiveId} />
              ))}
            </div>
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
                <h3 className="mb-4 font-semibold text-[#2c3a30]">Agent steps</h3>
                <AgentSteps steps={steps} running={phase === "running"} />
              </section>
              <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
                <h3 className="mb-2 font-semibold text-[#2c3a30]">Findings</h3>
                <FindingList findings={findingList} photoRooms={photoRooms} activeId={activeId} onSelect={setActiveId} />
              </section>
              {report && (
                <p className="text-xs text-[#849084]">{report.modelCalls} model calls · {report.disclaimer}</p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
