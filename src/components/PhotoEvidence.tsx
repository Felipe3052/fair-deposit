"use client";

import type { Finding } from "@/lib/agent/types";

export const FINDING_COLORS = {
  damage: "#d9480f",
  normal_wear: "#c99a12",
  rejected: "#9aa39b",
  pre_existing: "#2f6fd6",
} as const;

export function findingColor(f: Finding): string {
  if (f.status === "rejected") return FINDING_COLORS.rejected;
  if (f.moveIn?.verdict === "pre_existing") return FINDING_COLORS.pre_existing;
  return f.classification === "damage" ? FINDING_COLORS.damage : FINDING_COLORS.normal_wear;
}

/** Foto mit SVG-Overlay: Spark-Boxen (gestrichelt bis bestätigt) und SAM-Masken als Beleg. */
export default function PhotoEvidence({
  photo,
  findings,
  activeId,
  onSelect,
  scanning = false,
}: {
  photo: { id: string; room: string; dataUrl: string; width: number; height: number };
  findings: Finding[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Agent untersucht dieses Foto gerade → Scan-Linie */
  scanning?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale data URL, keine Optimierung möglich */}
        <img src={photo.dataUrl} alt={photo.room} className="block h-auto w-full" />
        {scanning && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="scan-overlay absolute inset-0" />
            <div className="absolute inset-0 ring-2 ring-inset ring-[#6fd39b]/70" />
          </div>
        )}
        <svg
          viewBox={`0 0 ${photo.width} ${photo.height}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {findings.map((f) => {
            const color = findingColor(f);
            const active = f.id === activeId;
            const rejected = f.status === "rejected";
            return (
              <g key={f.id} className="cursor-pointer" onClick={() => onSelect(f.id)} opacity={rejected && !active ? 0.45 : 1}>
                {f.evidence?.masks.map((m, i) => (
                  <path
                    key={i}
                    d={m.path}
                    transform={`translate(${m.bounds.left},${m.bounds.top}) scale(${(m.bounds.right - m.bounds.left) / m.width},${(m.bounds.bottom - m.bounds.top) / m.height})`}
                    fill={color}
                    fillOpacity={active ? 0.6 : 0.4}
                    className="mask-in transition-[fill-opacity] duration-500"
                  />
                ))}
                <rect
                  x={f.box.left}
                  y={f.box.top}
                  width={f.box.right - f.box.left}
                  height={f.box.bottom - f.box.top}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={active ? 5 : 3}
                  strokeDasharray={f.status === "confirmed" ? undefined : "14 10"}
                  rx={6}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="flex items-center justify-between px-4 py-2.5 text-sm">
        <span className="font-medium text-[#35443a]">{photo.room}</span>
        <span className="text-xs text-[#849084]">{findings.filter((f) => f.status !== "rejected").length} finding(s)</span>
      </figcaption>
    </figure>
  );
}
