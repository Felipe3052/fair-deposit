"use client";

import type { AgentStep } from "@/lib/agent/types";

const TOOL_LABELS: Record<string, string> = {
  prepare: "Preparing photos",
  inspect_photos: "Inspection (muse-spark vision)",
  zoom_region: "Zoom",
  segment_findings: "Evidence masks (SAM 3.1)",
  review_findings: "Second look",
  reject_finding: "Rejected finding",
  compute_share: "Fair share (code)",
  verify_report: "Verification",
  finish: "Done",
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
          Once you start, the agent&apos;s inspection, evidence and
          verification steps appear here live.
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
          The agent is still working …
        </li>
      )}
    </ol>
  );
}
