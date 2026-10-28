"use client";

import PhotoEvidence from "@/components/PhotoEvidence";
import type { Finding } from "@/lib/agent/types";

interface PhotoLike { id: string; room: string; dataUrl: string; width: number; height: number }

const VERDICT = {
  pre_existing: { title: "Already there at move-in", note: "You are not liable for this damage.", className: "bg-[#2f6fd6] text-white" },
  new: { title: "New since move-in", note: "This damage was not visible when you moved in.", className: "bg-[#d9480f] text-white" },
  unclear: { title: "Move-in photo inconclusive", note: "The spot is not clearly visible in the move-in photos.", className: "bg-[#eef0ea] text-[#35443a]" },
} as const;

/** Einzug und Auszug nebeneinander für einen Befund — der Beleg, den Vermieter sofort verstehen. */
export default function BeforeAfter({
  finding,
  moveOut,
  moveIn,
  onClose,
}: {
  finding: Finding;
  moveOut: PhotoLike;
  moveIn: PhotoLike | null;
  onClose: () => void;
}) {
  const verdict = VERDICT[finding.moveIn?.verdict ?? "unclear"];
  return (
    <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${verdict.className}`}>
        <div>
          <div className="text-sm font-semibold">{finding.label}: {verdict.title}</div>
          <div className="text-xs opacity-80">{finding.moveIn?.reason || verdict.note}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs font-medium opacity-80 hover:opacity-100" aria-label="Close comparison">✕ Close</button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#2f5aa8]">Move-in</div>
          {moveIn ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale data URL
            <img src={moveIn.dataUrl} alt={`${moveIn.room} at move-in`} className="w-full rounded-2xl" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#f4f6f1] text-sm text-[#849084]">No move-in photo</div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#b13d0c]">Move-out</div>
          <PhotoEvidence photo={moveOut} findings={[finding]} activeId={finding.id} onSelect={() => {}} />
        </div>
      </div>
    </section>
  );
}
