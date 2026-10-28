import { visionModel } from "@/lib/meta-client";
import { cropRegion, markedPreview, type NormalizedImage } from "@/lib/images";
import { parseJsonLoose } from "@/lib/agent/tools/inspect-photo";
import type { Finding, MoveInComparison } from "@/lib/agent/types";

/**
 * Einzug vs. Auszug: Spark sieht das Auszugsfoto mit markierter Stelle, einen Ausschnitt davon und
 * die Einzugsfotos desselben Raums. War der Schaden schon da, zahlt der Mieter nichts dafür.
 * Fotos sind nicht deckungsgleich (anderer Winkel, anderes Licht) — darum Vergleich über Ort und Aussehen.
 */
export async function compareMoveIn(
  finding: Finding,
  moveOut: NormalizedImage,
  moveIn: { id: string; image: NormalizedImage }[]
): Promise<MoveInComparison> {
  const [marked, { crop }, ...moveInPreviews] = await Promise.all([
    markedPreview(moveOut, finding.box),
    cropRegion(moveOut, finding.box, 0.5),
    ...moveIn.map((p) => markedPreview(p.image, null)),
  ]);
  const { client, model } = visionModel();
  const res = await client.chat.completions.create({
    model,
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You compare a tenant's move-in photos with the move-out photo of the same room.
IMAGE 1: move-out photo, the defect "${finding.label}" (${finding.description}) is marked with a red box.
IMAGE 2: close-up of that defect.
IMAGE 3${moveIn.length > 1 ? `–${moveIn.length + 2}` : ""}: move-in photo(s) of the same room, taken at the start of the tenancy (angle and lighting may differ).

Locate the same spot in the move-in photo(s) using surrounding features (windows, corners, furniture, floor pattern).
- "pre_existing": the same defect is clearly visible at the same spot at move-in.
- "new": the spot is clearly visible at move-in and the defect is NOT there.
- "unclear": the spot is not visible or not sharp enough in the move-in photo(s).
Return ONLY JSON: {"verdict": "pre_existing"|"new"|"unclear", "move_in_photo": 1-based index of the most useful move-in photo or null, "reason": "one short sentence a landlord would accept"}`,
        },
        { type: "image_url", image_url: { url: marked.dataUrl } },
        { type: "image_url", image_url: { url: crop.dataUrl } },
        ...moveInPreviews.map((p) => ({ type: "image_url" as const, image_url: { url: p.dataUrl } })),
      ],
    }],
  });
  try {
    const parsed = parseJsonLoose(res.choices[0]?.message?.content ?? "") as { verdict?: unknown; move_in_photo?: unknown; reason?: unknown };
    const verdict = parsed.verdict === "pre_existing" || parsed.verdict === "new" ? parsed.verdict : "unclear";
    const index = typeof parsed.move_in_photo === "number" ? parsed.move_in_photo - 1 : -1;
    return { verdict, moveInPhotoId: moveIn[index]?.id ?? moveIn[0]?.id ?? null, reason: String(parsed.reason ?? "").slice(0, 240) };
  } catch {
    return { verdict: "unclear", moveInPhotoId: null, reason: "Comparison returned no valid JSON" };
  }
}
