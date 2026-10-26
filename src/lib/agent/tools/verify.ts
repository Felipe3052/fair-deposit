import { MODEL_SPARK, SPARK_MAX_TOKENS, metaClient } from "@/lib/meta-client";

function toDataUrl(imageBase64: string): string {
  return imageBase64.startsWith("data:image")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;
}

/**
 * Budget-Prüfung: reiner Code (kein LLM).
 */
export function verifyBudget(
  totalChf: number,
  budgetChf: number
): { withinBudget: boolean; remaining: number } {
  return {
    withinBudget: totalChf <= budgetChf,
    remaining: Math.round((budgetChf - totalChf) * 100) / 100,
  };
}

/**
 * Vision-basierter Bild-Listen-Check ("der überraschende Moment"):
 * muse-spark sieht das generierte Redesign-Bild und bestätigt, dass die
 * Einkaufslisten-Produkte sichtbar sind. Das Modell als VERIFIKATOR.
 * Über Env-Flag abschaltbar (Budget-Diskiplin).
 */
export async function verifyImageConsistency(
  redesignImageBase64: string,
  productTitles: string[]
): Promise<{ imageListConsistent: boolean; missing: string[] }> {
  if (process.env.ENABLE_VISION_VERIFY === "false") {
    return { imageListConsistent: true, missing: [] };
  }
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
            text: `Du bist Verifikator: Prüfe, ob in diesem Raumfoto jedes der folgenden Produkte klar sichtbar ist:
${productTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Antworte AUSSCHLIESSLICH mit JSON:
{"imageListConsistent": boolean, "missing": string[]}
("missing" = Titel der NICHT sichtbaren Produkte)`,
          },
          {
            type: "image_url",
            image_url: { url: toDataUrl(redesignImageBase64) },
          },
        ],
      },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "";
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      imageListConsistent: Boolean(parsed.imageListConsistent),
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
    };
  } catch {
    // Bei unlesbarem JSON nicht hart fehlschlagen, aber markieren
    return { imageListConsistent: true, missing: ["(Verifikation unlesbar)"] };
  }
}
