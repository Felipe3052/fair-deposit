"use client";

import { useState } from "react";

export interface FurnitureChoice {
  id: string;
  label: string;
  category: string;
  action: "keep" | "replace";
}

interface Segment extends FurnitureChoice {
  confidence: number | null;
  box: { left: number; top: number; right: number; bottom: number };
  maskPath: string;
  maskWidth: number;
  maskHeight: number;
  maskBounds: { left: number; top: number; right: number; bottom: number };
}

interface SegmentResponse {
  width: number;
  height: number;
  objects: Omit<Segment, "action">[];
  error?: string;
}

interface Props {
  file: File | null;
  preview: string;
  onChange: (choices: FurnitureChoice[]) => void;
  onStatusChange: (status: "idle" | "running" | "ready" | "error") => void;
}

export default function FurnitureSelector({ file, preview, onChange, onStatusChange }: Props) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [status, setStatus] = useState<"idle" | "running" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  async function detect() {
    if (!file || status === "running") return;
    setStatus("running");
    onStatusChange("running");
    setError("");
    onChange([]);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Das Foto konnte für SAM nicht vorbereitet werden.");
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const samImage = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Das Foto konnte für SAM nicht komprimiert werden."));
        }, "image/jpeg", 0.88);
      });
      const form = new FormData();
      form.append("image", samImage, "room-sam.jpg");
      form.append("width", String(width));
      form.append("height", String(height));
      const response = await fetch("/api/segment", { method: "POST", body: form });
      const data = (await response.json()) as SegmentResponse;
      if (!response.ok) throw new Error(data.error ?? "SAM-Segmentierung fehlgeschlagen.");
      const choices = data.objects.map((object) => ({ ...object, action: "keep" as const }));
      setSegments(choices);
      setSize({ width: data.width, height: data.height });
      onChange(choices.map(({ id, label, category, action }) => ({ id, label, category, action })));
      setStatus("ready");
      onStatusChange("ready");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setStatus("error");
      onStatusChange("error");
    }
  }

  function toggle(id: string) {
    const updated = segments.map((segment) =>
      segment.id === id
        ? { ...segment, action: segment.action === "keep" ? "replace" as const : "keep" as const }
        : segment
    );
    setSegments(updated);
    onChange(updated.map(({ id: objectId, label, category, action }) => ({
      id: objectId, label, category, action,
    })));
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#e2e7de] bg-[#fafbf8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#34453a]">Was darf sich verändern?</p>
          <p className="mt-1 text-xs leading-5 text-[#758177]">
            SAM markiert Möbel im Foto. Tippe ein Objekt an, um zwischen Behalten und Ersetzen zu wechseln.
          </p>
        </div>
        <button
          type="button"
          onClick={detect}
          disabled={!file || status === "running"}
          className="shrink-0 rounded-xl border border-[#cbd6c9] bg-white px-3.5 py-2 text-xs font-semibold text-[#385340] transition hover:border-[#789178] hover:bg-[#f1f5ee] disabled:cursor-wait disabled:opacity-60"
        >
          {status === "running" ? "SAM erkennt Möbel …" : status === "ready" ? "Erneut erkennen" : "Möbel erkennen"}
        </button>
      </div>

      {status === "running" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs text-[#667168]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#bd8a4e]" />
          SAM 3.1 sucht gezielt nach Möbeln im Raum …
        </div>
      )}
      {error && <p className="mt-3 text-xs leading-5 text-[#9a493b]" role="alert">{error}</p>}

      {segments.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-xl bg-[#e8ebe4]"
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Raumfoto mit SAM-Möbelmasken" className="absolute inset-0 h-full w-full object-contain" />
            <svg
              viewBox={`0 0 ${size.width} ${size.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
              aria-label="Anklickbare SAM-Segmentierungen"
            >
              {segments.map((segment, index) => {
                const replaced = segment.action === "replace";
                const bounds = segment.maskBounds;
                const sx = (bounds.right - bounds.left) / segment.maskWidth;
                const sy = (bounds.bottom - bounds.top) / segment.maskHeight;
                return (
                  <g key={segment.id} onClick={() => toggle(segment.id)} className="cursor-pointer">
                    {segment.maskPath ? (
                      <path
                        d={segment.maskPath}
                        transform={`translate(${bounds.left} ${bounds.top}) scale(${sx} ${sy})`}
                        fill={replaced ? "#c87a52" : "#63916b"}
                        fillOpacity="0.38"
                        stroke={replaced ? "#9d5538" : "#365b3e"}
                        strokeWidth={Math.max(size.width, size.height) / 260}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : (
                      <rect x={segment.box.left} y={segment.box.top} width={segment.box.right - segment.box.left} height={segment.box.bottom - segment.box.top} fill={replaced ? "#c87a52" : "#63916b"} fillOpacity="0.22" />
                    )}
                    <circle
                      cx={segment.box.left + 18}
                      cy={segment.box.top + 18}
                      r={Math.max(size.width, size.height) / 55}
                      fill={replaced ? "#9d5538" : "#365b3e"}
                    />
                    <text
                      x={segment.box.left + 18}
                      y={segment.box.top + 18}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={Math.max(size.width, size.height) / 85}
                      fontWeight="700"
                    >{index + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-2">
            {segments.map((segment, index) => {
              const replaced = segment.action === "replace";
              return (
                <button
                  key={segment.id}
                  type="button"
                  aria-pressed={replaced}
                  onClick={() => toggle(segment.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    replaced ? "border-[#e4c4b5] bg-[#fff6f1]" : "border-[#dfe7dd] bg-white hover:border-[#b9cbb7]"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${replaced ? "bg-[#a85e40]" : "bg-[#456c4b]"}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#34453a]">{segment.label}</span>
                    <span className={`mt-0.5 block text-[11px] font-medium ${replaced ? "text-[#9d5538]" : "text-[#5e7c62]"}`}>{replaced ? "Wird ersetzt" : "Bleibt erhalten"}</span>
                  </span>
                  <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-full p-0.5 ${replaced ? "bg-[#b66e4f]" : "bg-[#739076]"}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition-transform ${replaced ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
              );
            })}
            <p className="px-1 pt-1 text-[11px] leading-4 text-[#7b887d]">
              {segments.filter((segment) => segment.action === "replace").length} zum Ersetzen · {segments.filter((segment) => segment.action === "keep").length} bleiben
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
