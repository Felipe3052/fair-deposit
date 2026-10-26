import { MODEL_SPARK, SPARK_MAX_TOKENS, metaClient } from "@/lib/meta-client";
import type { RoomAnalysis } from "@/lib/agent/types";

/** Entfernt evtl. Code-Fences und parst JSON robust. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
}

function toDataUrl(imageBase64: string): string {
  return imageBase64.startsWith("data:image")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;
}

/**
 * Vision-Analyse des Raumfotos → RoomAnalysis (Structured Output per Prompt-JSON).
 * Ein muse-spark-Call mit Bild-Input.
 */
export async function analyzeRoom(
  imageBase64: string
): Promise<RoomAnalysis> {
  const client = metaClient();
  const res = await client.chat.completions.create({
    model: MODEL_SPARK,
    max_tokens: SPARK_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analysiere dieses Raumfoto für einen Interior-Design-Agenten. Antworte AUSSCHLIESSLICH mit JSON (keine Erklärung) nach exakt diesem Schema:
{
  "roomType": string,
  "dimensionsEstimate": string,   // grobe Schätzung, klar als Schätzung markiert
  "currentFurniture": string[],   // erkannte Möbelstücke, auf Deutsch
  "colorPalette": string[],       // 3-5 Hex-Codes
  "lighting": string,             // "hell" | "dimmig" | "natürlich" | ...
  "styleNotes": string            // bestehende Stilmerkmale, die erhalten bleiben sollten
}`,
          },
          { type: "image_url", image_url: { url: toDataUrl(imageBase64) } },
        ],
      },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "";
  const analysis = parseJsonLoose(text) as RoomAnalysis;
  if (!analysis || !Array.isArray(analysis.currentFurniture)) {
    throw new Error("Raum-Analyse: unlesbares JSON vom Modell");
  }
  return analysis;
}
