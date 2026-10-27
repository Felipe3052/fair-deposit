import { MODEL_SPARK, metaClient } from "@/lib/meta-client";
import { boxFromNormalized, mapFromCrop, type NormalizedImage } from "@/lib/images";
import { COMPONENT_TYPES, FINDING_CATEGORIES, type Box, type Finding } from "@/lib/agent/types";
import type { RulePack } from "@/lib/rules";

const INSPECT_MAX_TOKENS = 6000;

/** Entfernt evtl. Code-Fences und parst das erste JSON-Objekt robust. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
}

function inspectPrompt(pack: RulePack, zoomed: boolean): string {
  return `You are a meticulous move-out apartment inspector${zoomed ? ". This image is a ZOOMED-IN crop of a larger photo — look closely for small defects (small holes, fine scratches, chips, stains)" : ""}.
Inspect the photo for damage, dirt or wear on walls, floors, ceilings, doors, windows, kitchen and bathroom fixtures and built-in appliances. Ignore movable furniture and decoration that belongs to the tenant.
For each finding, decide whether it is "normal_wear" (expected from ordinary use over time) or "damage" (beyond ordinary use: holes, deep gouges, large stains, cracks, burns, water damage, drawings).
Examples of normal wear under the "${pack.name}" rules: ${pack.normalWearExamples.join("; ")}.
Do NOT invent findings. Shadows, reflections, wood grain, texture and objects are not damage. If everything looks fine, return an empty list.
Return ONLY JSON:
{"findings":[{"label":"short English noun phrase, e.g. 'hole in wall'","category":"${FINDING_CATEGORIES.join("|")}","component":"${COMPONENT_TYPES.join("|")}","classification":"normal_wear|damage","severity":"minor|moderate|severe","description":"one sentence","box":[x1,y1,x2,y2],"confidence":0.0}]}
"box" is the tight bounding box in coordinates normalized to 0-1000 (x right, y down, origin top-left).`;
}

const asEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/**
 * Ein Spark-Vision-Call: Befunde mit Box. Bei `region` ist `image` ein Ausschnitt,
 * die Boxen werden in Koordinaten des Originalfotos zurückgerechnet.
 */
export async function inspectPhoto(args: {
  photoId: string;
  image: NormalizedImage;
  pack: RulePack;
  region?: { box: Box; original: { width: number; height: number } };
}): Promise<Omit<Finding, "id">[]> {
  const res = await metaClient().chat.completions.create({
    model: MODEL_SPARK,
    max_tokens: INSPECT_MAX_TOKENS,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: inspectPrompt(args.pack, Boolean(args.region)) },
        { type: "image_url", image_url: { url: args.image.dataUrl } },
      ],
    }],
  });
  const raw = res.choices[0]?.message?.content ?? "";
  let parsed: { findings?: Record<string, unknown>[] };
  try {
    parsed = parseJsonLoose(raw) as typeof parsed;
  } catch {
    throw new Error(`Inspektion lieferte kein gültiges JSON (${args.photoId})`);
  }
  return (parsed.findings ?? []).flatMap((f) => {
    if (!Array.isArray(f.box) || f.box.length !== 4) return [];
    let box = boxFromNormalized(f.box as number[], args.image.width, args.image.height);
    if (args.region) box = mapFromCrop(box, args.region.box, args.image);
    return [{
      photoId: args.photoId,
      label: String(f.label ?? "finding").slice(0, 80),
      category: asEnum(f.category, FINDING_CATEGORIES, "other"),
      component: asEnum(f.component, COMPONENT_TYPES, "other"),
      classification: asEnum(f.classification, ["normal_wear", "damage"] as const, "damage"),
      severity: asEnum(f.severity, ["minor", "moderate", "severe"] as const, "moderate"),
      description: String(f.description ?? "").slice(0, 300),
      box,
      confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0)),
      source: args.region ? "zoom" : "overview",
      status: "pending",
    } satisfies Omit<Finding, "id">];
  });
}
