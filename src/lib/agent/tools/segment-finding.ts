import { buildObjectPrompt, decodeMaskToSVGPath, parseImageStream, recordsOfKind } from "@meta-sam/parser";
import { MODEL_SAM, metaClient } from "@/lib/meta-client";
import { coverage, iou, type NormalizedImage } from "@/lib/images";
import type { Box, Evidence, Finding } from "@/lib/agent/types";

export type SegmentStrategy = "box" | "concept";

/**
 * Dünne/verstreute Schäden: Der Box-Prompt greift hier das dominante Objekt in der Box
 * (Sofa statt Kritzeleien, ganzer Boden statt Kratzer) — dafür nie auf Box zurückfallen.
 */
const THIN_CATEGORIES: ReadonlySet<Finding["category"]> = new Set(["scratch", "marks", "crack"]);

/**
 * SAM-Konzept-Prompts funktionieren nur mit kurzen Nomen: "crayon drawings on wall" → 0 Masken,
 * "drawing" → jede Kritzelei einzeln. Darum feste Kurzbegriffe pro Kategorie plus Sparks Label.
 */
const CONCEPT_TERMS: Record<Finding["category"], string[]> = {
  hole: ["hole"],
  scratch: ["scratches", "scratch"],
  stain: ["stain"],
  crack: ["crack"],
  marks: ["drawing", "scribble", "scuff mark"],
  water_damage: ["water stain"],
  mold: ["mold"],
  peeling_paint: ["peeling paint"],
  other: [],
};

export function defaultStrategy(finding: Pick<Finding, "category">): SegmentStrategy {
  return THIN_CATEGORIES.has(finding.category) ? "concept" : "box";
}

async function runSam(image: NormalizedImage, inputText: string) {
  const events = await metaClient().responses.create({
    model: MODEL_SAM,
    input: [{
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: inputText },
        { type: "input_image", image_url: image.dataUrl, detail: "auto" },
      ],
    }],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  const parsed = await parseImageStream(events).finalResult;
  return recordsOfKind(parsed.records, "mask");
}

/**
 * Plausibilität: Die Maske muss überwiegend in Sparks Box (mit Rand) liegen und darf
 * nicht viel grösser sein als die Box — sonst hat SAM ein anderes Objekt gegriffen.
 */
function plausible(bounds: Box, finding: Finding): boolean {
  const pad = 0.25;
  const w = finding.box.right - finding.box.left;
  const h = finding.box.bottom - finding.box.top;
  const padded = { left: finding.box.left - w * pad, top: finding.box.top - h * pad, right: finding.box.right + w * pad, bottom: finding.box.bottom + h * pad };
  const maskArea = (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
  const paddedArea = (padded.right - padded.left) * (padded.bottom - padded.top);
  return coverage(bounds, padded) >= 0.7 && maskArea <= paddedArea * 3;
}

export interface SegmentResult {
  evidence: Evidence | null;
  tried: { strategy: SegmentStrategy; masks: number; plausible: boolean }[];
}

type SamMask = Awaited<ReturnType<typeof runSam>>[number];

/** Alle Kurzbegriffe parallel; Instanzen über Begriffe hinweg zusammenführen (gleiche Stelle → höhere Konfidenz). */
async function runConcepts(finding: Finding, image: NormalizedImage): Promise<SamMask[]> {
  const terms = [...new Set([...CONCEPT_TERMS[finding.category], finding.label.toLowerCase()])];
  const results = await Promise.all(terms.map((t) => runSam(image, t).catch(() => [] as SamMask[])));
  const merged: SamMask[] = [];
  for (const m of results.flat()) {
    const dup = merged.findIndex((x) => iou(x.bounds, m.bounds) > 0.5);
    if (dup < 0) merged.push(m);
    else if ((m.confidence ?? 0) > (merged[dup].confidence ?? 0)) merged[dup] = m;
  }
  return merged;
}

/** Maske für einen Befund; probiert die gewählte Strategie, dann die andere (Box nie bei dünnen Schäden). */
export async function segmentFinding(
  finding: Finding,
  image: NormalizedImage,
  preferred: SegmentStrategy = defaultStrategy(finding)
): Promise<SegmentResult> {
  const order: SegmentStrategy[] = THIN_CATEGORIES.has(finding.category)
    ? ["concept"]
    : preferred === "box" ? ["box", "concept"] : ["concept", "box"];
  const tried: SegmentResult["tried"] = [];
  for (const strategy of order) {
    const masks = strategy === "concept"
      ? await runConcepts(finding, image)
      : await runSam(image, buildObjectPrompt({ size: { width: image.width, height: image.height }, objects: [{ id: 0, prompts: [{ box: finding.box }] }] }));
    // Konzept-Prompts liefern evtl. mehrere Instanzen (einzelne Kratzer) → alle plausiblen behalten
    const candidates = masks.filter((m) => plausible(m.bounds, finding));
    tried.push({ strategy, masks: masks.length, plausible: candidates.length > 0 });
    if (candidates.length) {
      const confidences = candidates.map((m) => m.confidence).filter((c): c is number => typeof c === "number");
      return {
        tried,
        evidence: {
          masks: candidates.map((m) => ({ path: decodeMaskToSVGPath(m.mask), width: m.mask.width, height: m.mask.height, bounds: m.bounds })),
          strategy,
          samConfidence: confidences.length ? Math.max(...confidences) : null,
        },
      };
    }
  }
  return { evidence: null, tried };
}
