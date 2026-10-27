"use client";

export interface AgentStep {
  tool: string;
  summary: string;
  at: string;
}

const TOOL_LABELS: Record<string, string> = {
  analyze_room: "Vision-Analyse",
  search_catalog: "Katalog-Suche",
  edit_room_image: "Redesign (muse-image)",
  verify: "Verifikation",
  finish: "Abschluss",
};

export default function AgentSteps({
  steps,
  running,
}: {
  steps: AgentStep[];
  running: boolean;
}) {
  if (!steps.length) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-[#f7f8f4] p-4 text-sm text-[#778378]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#6f866e] shadow-sm" aria-hidden="true">✦</span>
        <span className="leading-5">
          Sobald du startest, siehst du hier Analyse, Produktsuche und die
          Verifikation deines Entwurfs.
        </span>
      </div>
    );
  }
  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => (
        <li
          key={i}
          className="relative flex items-start gap-3 pb-4 text-sm last:pb-0"
        >
          <span
            className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              i === steps.length - 1 && running
                ? "animate-pulse bg-[#294b38] text-white"
                : "bg-[#eef2eb] text-[#668067]"
            }`}
          />
          {i < steps.length - 1 && (
            <span className="absolute left-[13px] top-7 h-[calc(100%-1rem)] w-px bg-[#e5e9e1]" />
          )}
          <span className="min-w-0 flex-1 pt-0.5">
            <span className="font-semibold text-[#35443a]">
              {TOOL_LABELS[s.tool] ?? s.tool}
            </span>
            <span className="mt-0.5 block leading-5 text-[#758177]">{s.summary}</span>
          </span>
        </li>
      ))}
      {running && (
        <li className="ml-10 pt-1 text-xs font-medium text-[#849084]">
          Der Agent arbeitet weiter …
        </li>
      )}
    </ol>
  );
}
