"use client";

import { useEffect, useRef, useState } from "react";
import { COMPONENT_TYPES, type ComponentType, type ShareLine, type ShareTotals } from "@/lib/agent/types";
import type { Lifespan } from "@/lib/fair-share";

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  wall_paint: "Wall paint", wallpaper: "Wallpaper", carpet: "Carpet", laminate: "Laminate", vinyl: "Vinyl / linoleum",
  parquet_finish: "Parquet sealing", parquet_solid: "Parquet / wood floor", tiles: "Tiles", kitchen_counter: "Kitchen countertop",
  door: "Door", window: "Window", bathroom_fixture: "Bathroom fixture", appliance: "Appliance", other: "Other",
};

/** Nachtrag des Mieters zu einer offenen Position. */
export interface LineFix { component?: ComponentType; installedYear?: string; variant?: string }

const fixInputClass = "rounded-lg border border-[#e6d49a] bg-[#fffaf0] px-2 py-1 text-xs text-[#2c3a30] outline-none focus:border-[#c99a12]";

const STATUS: Record<ShareLine["status"], { label: string; className: string }> = {
  damage: { label: "damage", className: "bg-[#fdebe2] text-[#b13d0c]" },
  normal_wear: { label: "normal wear", className: "bg-[#fbf3d9] text-[#8a6a08]" },
  pre_existing: { label: "already at move-in", className: "bg-[#e6eefb] text-[#2f5aa8]" },
  no_evidence: { label: "no evidence", className: "bg-[#eef2eb] text-[#4d6450]" },
  age_unknown: { label: "age needed", className: "bg-[#eef0f6] text-[#4b5a86]" },
  lifespan_unknown: { label: "not in table", className: "bg-[#eef0f6] text-[#4b5a86]" },
};

/** Zählt weich auf den Zielwert (beim ersten Erscheinen vom verlangten Betrag herunter). */
function useCountTo(target: number, start: number, durationMs = 1600): { value: number; settled: boolean } {
  const [value, setValue] = useState(start);
  const from = useRef(start);
  useEffect(() => {
    const begin = from.current;
    if (begin === target) return;
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = begin + (target - begin) * eased;
      from.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return { value, settled: Math.abs(value - target) < 0.005 };
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default function ShareTable({
  lines,
  totals,
  ruleSource,
  lifespans,
  componentInputs,
  onFix,
  edited,
}: {
  lines: ShareLine[];
  totals: ShareTotals;
  ruleSource: { name: string; isEstimate: boolean; title: string | null; url: string | null };
  lifespans: Lifespan[];
  componentInputs: Partial<Record<ComponentType, { installedYear: string; variant: string }>>;
  /** Nur nach Abschluss gesetzt; ohne onFix keine Nachtrags-Felder */
  onFix?: (index: number, fix: LineFix) => void;
  edited: boolean;
}) {
  const saved = totals.claimed - totals.tenantPays;
  const fair = useCountTo(totals.tenantPays, totals.claimed);
  const shownSaved = totals.claimed - fair.value;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rise-in rounded-2xl bg-white p-3 ring-1 ring-black/5 sm:p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[#849084]">Landlord claims</div>
          <div className={`mt-1 text-2xl font-semibold sm:text-3xl transition-colors duration-700 ${fair.settled && saved > 0 ? "text-[#b13d0c] line-through decoration-2" : "text-[#2c3a30]"}`}>
            {formatMoney(totals.claimed, totals.currency)}
          </div>
        </div>
        <div className="rise-in order-first col-span-2 rounded-2xl bg-[#294b38] p-4 text-white sm:order-none sm:col-span-1 shadow-lg shadow-[#294b38]/20 [animation-delay:120ms]">
          <div className="text-xs font-medium uppercase tracking-wide text-white/70">Your fair share</div>
          <div className="mt-1 text-2xl font-semibold sm:text-3xl tabular-nums">{formatMoney(fair.value, totals.currency)}</div>
          {totals.openLines > 0 && <div className="mt-1 text-xs text-white/70">+ {totals.openLines} line(s) need more input{onFix ? " — fill in below" : ""}</div>}
          {edited && totals.openLines === 0 && <div className="mt-1 text-xs text-white/70">Updated with your input</div>}
        </div>
        <div className="rise-in rounded-2xl bg-[#e8f3ea] p-3 ring-1 ring-[#294b38]/10 [animation-delay:240ms] sm:p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[#3f6b47]">You keep</div>
          <div className="mt-1 text-2xl font-semibold sm:text-3xl tabular-nums text-[#294b38]">{formatMoney(shownSaved, totals.currency)}</div>
          {totals.claimed > 0 && fair.settled && <div className="mt-1 text-xs text-[#3f6b47]">{Math.round((saved / totals.claimed) * 100)}% of the claim was not justified</div>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full text-left text-sm sm:min-w-[640px]">
          <thead className="hidden text-xs uppercase sm:table-header-group tracking-wide text-[#849084]">
            <tr className="border-b border-[#eef0ea]">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 text-right font-medium">Age / lifespan</th>
              <th className="px-4 py-3 text-right font-medium">Claimed</th>
              <th className="px-4 py-3 text-right font-medium">You owe</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="block border-b border-[#f3f4ef] align-top last:border-0 sm:table-row">
                <td className="block px-4 pb-1 pt-3 sm:table-cell sm:py-3">
                  <div className="font-medium text-[#2c3a30]">{l.claimDescription ?? "Damage without claim"}</div>
                  <div className="mt-0.5 text-xs text-[#758177]">{l.lifespanLabel ?? l.component.replace(/_/g, " ")}</div>
                </td>
                <td className="block px-4 py-1 sm:table-cell sm:py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[l.status].className}`}>{STATUS[l.status].label}</span>
                  <div className="mt-1 max-w-sm text-xs leading-5 text-[#5f6d63]">{l.explanation}</div>
                  {onFix && (l.status === "age_unknown" || l.status === "lifespan_unknown" || l.status === "damage") && (
                    <LineFixer line={l} lifespans={lifespans} input={componentInputs[l.component]} onFix={(fix) => onFix(i, fix)} />
                  )}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-[#5f6d63] sm:table-cell">
                  {l.ageYears ?? "?"} / {l.lifespanYears ?? "?"} y
                  {l.residualShare !== null && <div className="text-xs text-[#849084]">{Math.round(l.residualShare * 100)}% residual</div>}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-[#5f6d63] sm:table-cell">
                  {l.claimedAmount !== null ? formatMoney(l.claimedAmount, totals.currency) : "—"}
                </td>
                <td className="flex items-baseline justify-between gap-3 px-4 pb-3 pt-1 font-semibold tabular-nums text-[#2c3a30] sm:table-cell sm:py-3 sm:text-right">
                  <span className="text-xs font-normal text-[#758177] sm:hidden">
                    Claimed {l.claimedAmount !== null ? formatMoney(l.claimedAmount, totals.currency) : "—"}
                    {l.lifespanYears !== null && l.ageYears !== null ? ` · ${l.ageYears}/${l.lifespanYears} y` : ""} · you owe
                  </span>
                  {l.tenantPays !== null ? formatMoney(l.tenantPays, totals.currency) : l.status === "no_evidence" ? formatMoney(0, totals.currency) : "open"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-[#849084]">
        Rules: {ruleSource.name}
        {ruleSource.isEstimate && " — estimate, no legal source"}
        {ruleSource.url && (
          <>
            {" · "}
            <a href={ruleSource.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">source</a>
          </>
        )}
        . Numbers are computed in code from your inputs, never by the model. Not legal advice.
      </p>
    </div>
  );
}

/** Felder für offene Positionen: Bauteil (falls nicht in der Tabelle), Material und Einbaujahr. */
function LineFixer({
  line,
  lifespans,
  input,
  onFix,
}: {
  line: ShareLine;
  lifespans: Lifespan[];
  input?: { installedYear: string; variant: string };
  onFix: (fix: LineFix) => void;
}) {
  const known = new Set(lifespans.map((l) => l.component));
  const variants = lifespans.filter((l) => l.component === line.component && l.variant);
  const standard = lifespans.find((l) => l.component === line.component && !l.variant);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 print:hidden">
      {line.status === "lifespan_unknown" ? (
        <select value="" onChange={(e) => onFix({ component: e.target.value as ComponentType })} className={fixInputClass} aria-label="Which component is this?">
          <option value="" disabled>Which component is this?</option>
          {COMPONENT_TYPES.filter((t) => known.has(t)).map((t) => <option key={t} value={t}>{COMPONENT_LABELS[t]}</option>)}
        </select>
      ) : (
        <>
          {variants.length > 0 && (
            <select value={input?.variant ?? ""} onChange={(e) => onFix({ variant: e.target.value })} className={fixInputClass} aria-label="Material">
              <option value="">{standard?.label ?? "Standard"}</option>
              {variants.map((v) => <option key={v.variant} value={v.variant}>{v.label}</option>)}
            </select>
          )}
          <span className="text-xs text-[#758177]">Last renewed:</span>
          <input
            value={input?.installedYear ?? ""}
            onChange={(e) => onFix({ installedYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="Last renewed (year)"
            inputMode="numeric"
            className={`${fixInputClass} w-36`}
            aria-label="Year last renewed"
          />
        </>
      )}
    </div>
  );
}
