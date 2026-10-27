"use client";

import type { Finding } from "@/lib/agent/types";
import { findingColor } from "@/components/PhotoEvidence";

const STATUS_LABELS: Record<Finding["status"], string> = {
  pending: "checking",
  confirmed: "confirmed",
  unconfirmed: "no evidence",
  rejected: "rejected",
};

export default function FindingList({
  findings,
  photoRooms,
  activeId,
  onSelect,
}: {
  findings: Finding[];
  photoRooms: Record<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!findings.length) {
    return <p className="text-sm text-[#849084]">No findings yet.</p>;
  }
  // Bestätigte zuerst, abgelehnte zuletzt
  const order: Finding["status"][] = ["confirmed", "pending", "unconfirmed", "rejected"];
  const sorted = [...findings].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <ul className="divide-y divide-[#eef0ea]">
      {sorted.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onSelect(f.id)}
            className={`flex w-full items-start gap-3 px-2 py-3 text-left transition-colors ${f.id === activeId ? "bg-[#f4f6f1]" : "hover:bg-[#fafbf8]"}`}
          >
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: findingColor(f) }} />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${f.status === "rejected" ? "text-[#9aa39b] line-through" : "text-[#2c3a30]"}`}>
                {f.label}
              </span>
              <span className="mt-0.5 block text-xs text-[#758177]">
                {photoRooms[f.photoId] ?? f.photoId} · {f.classification === "damage" ? "damage" : "normal wear"} · {f.severity}
                {f.source === "zoom" && " · found by zooming in"}
              </span>
              {f.review?.reason && (
                <span className="mt-1 block text-xs leading-5 text-[#5f6d63]">“{f.review.reason}”</span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
              <span className="rounded-full bg-[#eef2eb] px-2 py-0.5 font-medium text-[#4d6450]">{STATUS_LABELS[f.status]}</span>
              {f.evidence && (
                <span className="text-[#849084]">SAM mask · {f.evidence.strategy}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
