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
  products: { title: string; imageUrl: string | null }[]
): Promise<{ imageListConsistent: boolean; missing: string[] }> {
  if (process.env.ENABLE_VISION_VERIFY === "false") {
    return { imageListConsistent: true, missing: [] };
  }
  const client = metaClient();
  const referencedProducts = products.slice(0, 9).filter((product) => product.imageUrl);
  const referenceParts = referencedProducts.flatMap((product, index) => [
    {
      type: "text" as const,
      text: `Produktreferenz ${index + 1}: ${product.title}. Vergleiche Silhouette, Form, Material und Farbe.`,
    },
    {
      type: "image_url" as const,
      image_url: { url: product.imageUrl! },
    },
  ]);
  const res = await client.chat.completions.create({
    model: MODEL_SPARK,
    max_tokens: SPARK_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Du bist ein strenger Produkt-Verifikator. Die Produktfotos davor sind Referenzen; das letzte Bild ist das redesignierte Zimmer. Prüfe für jedes Produkt, ob es im Zimmer sichtbar ist und ob Form, Silhouette und Material plausibel mit genau dieser Referenz übereinstimmen. Ein runder Tisch darf nicht als eckiger Tisch gelten. Wenn eine Form sichtbar abweicht, liste das Produkt mit kurzer Begründung in "missing" auf. Rate nicht: Wenn die Übereinstimmung unklar ist, gilt sie als nicht bestätigt.

Produktliste:
${products.map((product, i) => `${i + 1}. ${product.title}`).join("\n")}

Antworte AUSSCHLIESSLICH mit JSON:
{"imageListConsistent": boolean, "missing": string[]}
("missing" = nicht sichtbar oder in Form/Material klar abweichend; begründe knapp)`,
          },
          ...referenceParts,
          { type: "text", text: "Prüfe jetzt dieses finale Redesign-Bild:" },
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
    const missing = Array.isArray(parsed.missing) ? parsed.missing : [];
    return {
      imageListConsistent: Boolean(parsed.imageListConsistent) && missing.length === 0,
      missing,
    };
  } catch {
    // Bei unlesbarem JSON darf der Agent das Ergebnis nicht als verifiziert ausgeben.
    return { imageListConsistent: false, missing: ["Verifikation unlesbar"] };
  }
}
