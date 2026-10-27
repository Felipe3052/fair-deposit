import {
  decodeMaskToSVGPath,
  parseImageStream,
  recordsOfKind,
} from "@meta-sam/parser";
import { MODEL_SAM, metaClient } from "@/lib/meta-client";

export interface FurnitureSegment {
  id: string;
  label: string;
  category: string;
  confidence: number | null;
  box: { left: number; top: number; right: number; bottom: number };
  maskPath: string;
  maskWidth: number;
  maskHeight: number;
  maskBounds: { left: number; top: number; right: number; bottom: number };
}

const FURNITURE_PROMPTS = [
  { text: "sofa", label: "Sofa", category: "sofa" },
  { text: "armchair", label: "Sessel", category: "armchair" },
  { text: "coffee table", label: "Couchtisch", category: "coffee_table" },
  { text: "dining table", label: "Esstisch", category: "table" },
  { text: "chair", label: "Stuhl", category: "dining" },
  { text: "bookcase", label: "Regal", category: "bookcase" },
  { text: "floor lamp", label: "Stehlampe", category: "lamp" },
  { text: "rug", label: "Teppich", category: "rug" },
] as const;

/** One concrete concept per SAM call, as required by the Meta SAM API. */
export async function segmentFurniture(
  imageDataUrl: string
): Promise<FurnitureSegment[]> {
  const client = metaClient();
  const failures: string[] = [];
  const results = await Promise.all(
    FURNITURE_PROMPTS.map(async (prompt) => {
      try {
        const events = await client.responses.create({
          model: MODEL_SAM,
          input: [
            {
              type: "message",
              role: "user",
              content: [
                { type: "input_text", text: prompt.text },
                { type: "input_image", image_url: imageDataUrl, detail: "auto" },
              ],
            },
          ],
          stream: true,
          metadata: { mask_encoding: "one_bit", include_confidence: "true" },
        });
        const parsed = await parseImageStream(events).finalResult;
        const boxes = recordsOfKind(parsed.records, "box");
        const masks = recordsOfKind(parsed.records, "mask");
        return masks.flatMap((mask, index) => {
          const box = boxes.find((candidate) => candidate.objectId === mask.objectId) ?? boxes[index];
          if (!box) return [];
          return [{
            id: `${prompt.category}-${mask.objectId}`,
            label: prompt.label,
            category: prompt.category,
            confidence: mask.confidence ?? box.confidence ?? null,
            box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
            maskPath: decodeMaskToSVGPath(mask.mask),
            maskWidth: mask.mask.width,
            maskHeight: mask.mask.height,
            maskBounds: mask.bounds,
          } satisfies FurnitureSegment];
        });
      } catch (error) {
        console.warn(`SAM-Segmentierung für ${prompt.text} fehlgeschlagen`, error);
        failures.push(error instanceof Error ? error.message : String(error));
        return [];
      }
    })
  );
  const segments = results.flat();
  if (!segments.length) {
    if (failures.length === FURNITURE_PROMPTS.length) {
      throw new Error(`SAM-API-Abfrage fehlgeschlagen: ${failures[0]}`);
    }
    throw new Error("SAM hat keine Möbel erkannt. Prüfe das Foto und versuche es erneut.");
  }
  return segments;
}
