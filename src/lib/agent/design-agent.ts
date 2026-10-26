import { MODEL_SPARK, SPARK_MAX_TOKENS, metaClient } from "@/lib/meta-client";
import {
  CATALOG_CATEGORIES,
  getProducts,
  searchCatalog,
  type CatalogProduct,
} from "@/lib/catalog";
import { checkBudget, planBudget, sumChf } from "@/lib/budget";
import { analyzeRoom } from "@/lib/agent/tools/analyze-room";
import { editRoomImage } from "@/lib/agent/tools/edit-image";
import { verifyBudget, verifyImageConsistency } from "@/lib/agent/tools/verify";
import type {
  DesignEvent,
  DesignSession,
  RoomAnalysis,
} from "@/lib/agent/types";

const MAX_ITERATIONS = 8; // Iterations-Cap (Budget-Diskiplin)

/** Tools, die der muse-spark-Agent im Loop selbst aufrufen kann. */
const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_catalog",
      description:
        "Sucht reale Produkte aus einem IKEA-Katalog. Gibt Kandidaten mit ID, Titel, Kategorie und CHF-Preis zurück.",
      parameters: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: CATALOG_CATEGORIES,
            },
            description: "Kategorien, die gesucht werden",
          },
          maxChf: {
            type: "number",
            description: "Max. CHF-Preis je Produkt",
          },
        },
        required: ["categories", "maxChf"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_room_image",
      description:
        "Erzeugt das redesignierte Raumfoto mit muse-image. Zeigt exakt die gewählten Produkte.",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "Finale IKEA-Produkt-IDs, die im Bild erscheinen sollen",
          },
          style_hint: { type: "string", description: "Zusätzlicher Stil-Hinweis" },
        },
        required: ["product_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verify",
      description:
        "Verifiziert die aktuelle Auswahl: Budget eingehalten (reiner Code) und Bild ↔ Einkaufsliste konsistent (Vision-Check).",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "Zu verifizierende IKEA-Produkt-IDs",
          },
        },
        required: ["product_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finish",
      description:
        "Schliesst den Design-Run ab. NUR aufrufen, wenn verify innerhalb des Budgets bestanden hat.",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "Finale IKEA-Produkt-IDs der Einkaufsliste",
          },
        },
        required: ["product_ids"],
      },
    },
  },
];

export async function* runDesignAgent(
  imageBase64: string,
  style: string,
  budgetChf: number
): AsyncGenerator<DesignEvent, void, void> {
  const agentSteps: DesignSession["agentSteps"] = [];
  let modelCalls = 0;
  const step = (tool: string, summary: string) => {
    agentSteps.push({ tool, summary, at: new Date().toISOString() });
    return { type: "step", tool, summary } as DesignEvent;
  };

  try {
    // 1. Vision-Analyse
    yield step("analyze_room", "Analysiere Raumfoto mit muse-spark Vision");
    const analysis: RoomAnalysis = await analyzeRoom(imageBase64);
    modelCalls++;
    yield { type: "analysis", data: analysis };

    // 2. Budget-Plan (programmatisch)
    const allocation = planBudget(budgetChf, CATALOG_CATEGORIES);
    const budgetPlan = { totalChf: budgetChf, allocation };
    yield { type: "budgetPlan", data: budgetPlan };

    // 3. Agent-Loop: muse-spark entscheidet selbst über Tool-Aufrufe
    const client = metaClient();
    const messages: Record<string, unknown>[] = [
      {
        role: "system",
        content: `Du bist ein Interior-Design-Agent. Dein Auftrag: einen Wohnraum im Stil "${style}" innerhalb eines Budgets von ${budgetChf} CHF neu einrichten.

Regeln:
1. Rufe zuerst search_catalog, um reale Kandidaten zu finden (Nutze die Budget-Allokation unten als Richtwert pro Kategorie).
2. Wähle eine koordinierte Auswahl (max. 10 Produkte), die zum Stil passt und deren Summe unter dem Budget bleibt.
3. Rufe edit_room_image auf, um das redesignierte Foto zu erzeugen.
4. Rufe verify auf. Wenn Budget überschritten oder Produkte im Bild fehlen → wähle günstigere/passendere Alternativen und wiederhole.
5. Rufe finish auf, sobald verify bestanden hat.

Budget-Allokation (Richtwert max. CHF je Kategorie):
${allocation.map((a) => `- ${a.category}: ${a.maxChf} CHF`).join("\n")}

Erkannte Möbel im Raum: ${analysis.currentFurniture.join(", ")}
Stilmerkmale, die erhalten bleiben: ${analysis.styleNotes}

Antworte auf Deutsch. Produktdaten kommen ausschliesslich aus dem Katalog — erfinde niemals Produkte oder Preise.`,
      },
      {
        role: "user",
        content: `Erstelle das Design für den Stil "${style}" mit Budget ${budgetChf} CHF. Beginne mit search_catalog.`,
      },
    ];

    let finalIds: string[] | null = null;
    let lastVerification: { withinBudget: boolean; issues: string[] } | null =
      null;
    let redesignImage: string | null = null;

    for (let i = 0; i < MAX_ITERATIONS && !finalIds; i++) {
      const res = await client.chat.completions.create({
        model: MODEL_SPARK,
        max_tokens: SPARK_MAX_TOKENS,
        messages: messages as never,
        tools: AGENT_TOOLS as never,
      });
      modelCalls++;
      const msg = (res.choices[0]?.message ?? {}) as unknown as Record<string, unknown>;
      const toolCalls = (msg?.tool_calls ?? []) as Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;

      if (!toolCalls.length) {
        // Modell plaudert statt Tools zu rufen → Aufforderung
        messages.push({ role: "assistant", content: msg?.content ?? "" });
        messages.push({
          role: "user",
          content:
            "Benutze ausschliesslich die bereitgestellten Tools (search_catalog, edit_room_image, verify, finish).",
        });
        continue;
      }

      messages.push({
        role: "assistant",
        content: msg?.content ?? null,
        tool_calls: toolCalls,
      } as never);

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}");
        } catch {
          args = {};
        }
        let result: unknown;

        if (name === "search_catalog") {
          const cats = (args.categories as string[]) ?? [];
          const candidates = searchCatalog({
            categories: cats,
            maxChf: Number(args.maxChf ?? budgetChf),
          });
          yield step(
            "search_catalog",
            `Suche Kandidaten in: ${cats.join(", ")} → ${candidates.length} Treffer`
          );
          // Kompakte Kandidatenliste (kein Prompt-Bloat)
          result = candidates.map((c) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            priceChf: c.priceChf,
            sourceUrl: c.sourceUrl,
          }));
        } else if (name === "edit_room_image") {
          const ids = (args.product_ids as string[]) ?? [];
          const products = getProducts(ids);
          yield step(
            "edit_room_image",
            `Redesign mit muse-image (${products.length} Produkte im Bild)`
          );
          redesignImage = await editRoomImage({
            imageBase64,
            style: `${style} — ${String(args.style_hint ?? "")}`.trim(),
            keep: analysis.currentFurniture,
            replace: [],
            productTitles: products.map((p) => p.title),
          });
          yield { type: "image", dataUrl: redesignImage };
          result = { ok: true, note: "Bild erzeugt. Rufe verify auf." };
        } else if (name === "verify") {
          const ids = (args.product_ids as string[]) ?? [];
          const products = getProducts(ids);
          const total = sumChf(products.map((p) => p.priceChf));
          const budgetCheck = checkBudget(total, budgetChf);
          let imageCheck = { imageListConsistent: true, missing: [] as string[] };
          if (redesignImage) {
            const b64 = redesignImage.replace(/^data:image\/\w+;base64,/, "");
            imageCheck = await verifyImageConsistency(
              b64,
              products.map((p) => p.title)
            );
            modelCalls++;
          }
          const issues: string[] = [];
          if (!budgetCheck.withinBudget)
            issues.push(
              `Budget überschritten: ${total} CHF > ${budgetChf} CHF`
            );
          if (!imageCheck.imageListConsistent && imageCheck.missing.length)
            issues.push(
              `Im Bild fehlen: ${imageCheck.missing.join(", ")}`
            );
          lastVerification = { withinBudget: budgetCheck.withinBudget, issues };
          yield step(
            "verify",
            issues.length
              ? `Probleme: ${issues.join(" · ")}`
              : `Bestanden — Summe ${total} CHF ≤ ${budgetChf} CHF, Bild ↔ Liste konsistent`
          );
          result = { totalChf: total, budgetChf, issues };
        } else if (name === "finish") {
          const ids = (args.product_ids as string[]) ?? [];
          const products = getProducts(ids);
          const total = sumChf(products.map((p) => p.priceChf));
          const budgetCheck = checkBudget(total, budgetChf);
          if (!budgetCheck.withinBudget) {
            yield step("finish", `Abgelehnt: Budget überschritten (${total} CHF)`);
            result = {
              ok: false,
              error: `Summe ${total} CHF überschreitet Budget ${budgetChf} CHF. Wähle günstigere Alternativen und rufe erneut finish auf.`,
            };
          } else {
            finalIds = products.map((p) => p.id);
            yield step("finish", `Bestätigt — ${products.length} Produkte, ${total} CHF`);
            result = { ok: true };
          }
        } else {
          result = { error: `Unbekanntes Tool: ${name}` };
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        } as never);
      }
    }

    if (!finalIds) {
      throw new Error(
        lastVerification?.issues.length
          ? `Agent-Loop abgebrochen: ${lastVerification.issues.join(" · ")}`
          : "Agent-Loop abgebrochen: keine finale Auswahl (Iterationslimit)"
      );
    }

    // 4. Finales Resultat (programmatisch berechnet, nie vom Modell)
    const products: CatalogProduct[] = getProducts(finalIds);
    const items = products.map((p) => ({
      ...p,
      reason: "Vom Agenten ausgewählt (Stil + Budget-Passung)",
    }));
    const totalChf = sumChf(products.map((p) => p.priceChf));
    const budgetCheck = checkBudget(totalChf, budgetChf);

    const shoppingList = {
      items,
      totalChf,
      budgetChf,
      withinBudget: budgetCheck.withinBudget,
    };
    yield { type: "list", data: shoppingList };

    const session: DesignSession = {
      id: crypto.randomUUID(),
      request: { style, budgetChf },
      analysis,
      budgetPlan,
      shoppingList,
      redesignImageUrl: redesignImage ?? "",
      verification: {
        imageListConsistent: lastVerification?.withinBudget ?? true,
        withinBudget: budgetCheck.withinBudget,
        issues: lastVerification?.issues ?? [],
      },
      agentSteps,
      modelCalls,
      createdAt: new Date().toISOString(),
    };
    yield { type: "done", data: session };
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
