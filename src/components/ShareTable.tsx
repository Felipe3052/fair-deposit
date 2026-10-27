"use client";

import type { ShareLine, ShareTotals } from "@/lib/agent/types";

const STATUS: Record<ShareLine["status"], { label: string; className: string }> = {
  damage: { label: "damage", className: "bg-[#fdebe2] text-[#b13d0c]" },
  normal_wear: { label: "normal wear", className: "bg-[#fbf3d9] text-[#8a6a08]" },
  no_evidence: { label: "no evidence", className: "bg-[#eef2eb] text-[#4d6450]" },
  age_unknown: { label: "age needed", className: "bg-[#eef0f6] text-[#4b5a86]" },
  lifespan_unknown: { label: "not in table", className: "bg-[#eef0f6] text-[#4b5a86]" },
};

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default function ShareTable({
  lines,
  totals,
  ruleSource,
}: {
  lines: ShareLine[];
  totals: ShareTotals;
  ruleSource: { name: string; isEstimate: boolean; title: string | null; url: string | null };
}) {
  const saved = totals.claimed - totals.tenantPays;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="text-xs font-medium uppercase tracking-wide text-[#849084]">Landlord claims</div>
          <div className="mt-1 text-2xl font-semibold text-[#2c3a30]">{formatMoney(totals.claimed, totals.currency)}</div>
        </div>
        <div className="rounded-2xl bg-[#294b38] p-4 text-white">
          <div className="text-xs font-medium uppercase tracking-wide text-white/70">Your fair share</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(totals.tenantPays, totals.currency)}</div>
          {totals.openLines > 0 && <div className="mt-1 text-xs text-white/70">+ {totals.openLines} line(s) need more input</div>}
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="text-xs font-medium uppercase tracking-wide text-[#849084]">Difference</div>
          <div className="mt-1 text-2xl font-semibold text-[#2c3a30]">{formatMoney(saved, totals.currency)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#849084]">
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
              <tr key={i} className="border-b border-[#f3f4ef] align-top last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#2c3a30]">{l.claimDescription ?? "Damage without claim"}</div>
                  <div className="mt-0.5 text-xs text-[#758177]">{l.lifespanLabel ?? l.component.replace(/_/g, " ")}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[l.status].className}`}>{STATUS[l.status].label}</span>
                  <div className="mt-1 max-w-sm text-xs leading-5 text-[#5f6d63]">{l.explanation}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#5f6d63]">
                  {l.ageYears ?? "?"} / {l.lifespanYears ?? "?"} y
                  {l.residualShare !== null && <div className="text-xs text-[#849084]">{Math.round(l.residualShare * 100)}% residual</div>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#5f6d63]">
                  {l.claimedAmount !== null ? formatMoney(l.claimedAmount, totals.currency) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#2c3a30]">
                  {l.tenantPays !== null ? formatMoney(l.tenantPays, totals.currency) : "open"}
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
