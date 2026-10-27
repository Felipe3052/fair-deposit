import { buildObjectPrompt, decodeMaskToSVGPath, parseImageStream, recordsOfKind } from "@meta-sam/parser";
import { MODEL_SAM, metaClient } from "@/lib/meta-client";
import { coverage, type NormalizedImage } from "@/lib/images";
import type { Box, Evidence, Finding } from "@/lib/agent/types";

export type SegmentStrategy = "box" | "concept";

/**
 * Spike-Erkenntnis: Box-Prompt ist exakt bei flächigen Schäden, greift bei dünnen
 * Schäden aber das dominante Objekt in der Box; Konzept-Prompt maskiert Kratzer und
 * Kritzeleien exakt, kann aber am Ziel vorbei oder ganz leer laufen.
 */
export function defaultStrategy(finding: Pick<Finding, "category">): SegmentStrategy {
  return finding.category === "scratch" || finding.category === "marks" ? "concept" : "box";
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

/** Maske für einen Befund; probiert die gewählte Strategie, dann die andere. */
export async function segmentFinding(
  finding: Finding,
  image: NormalizedImage,
  preferred: SegmentStrategy = defaultStrategy(finding)
): Promise<SegmentResult> {
  const order: SegmentStrategy[] = preferred === "box" ? ["box", "concept"] : ["concept", "box"];
  const tried: SegmentResult["tried"] = [];
  for (const strategy of order) {
    const inputText = strategy === "concept"
      ? finding.label
      : buildObjectPrompt({ size: { width: image.width, height: image.height }, objects: [{ id: 0, prompts: [{ box: finding.box }] }] });
    const masks = await runSam(image, inputText);
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
