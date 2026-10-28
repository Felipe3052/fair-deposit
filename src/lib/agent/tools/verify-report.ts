import { visionModel } from "@/lib/meta-client";
import { cropRegion, type NormalizedImage } from "@/lib/images";
import { computeShares, type Lifespan, type ShareInput, type ShareLine, type ShareTotals } from "@/lib/fair-share";
import { parseJsonLoose } from "@/lib/agent/tools/inspect-photo";
import type { Finding, InspectionRequest } from "@/lib/agent/types";

/**
 * Vision-Gegenprüfung auf dem Ausschnitt: Spark sieht nur die markierte Stelle
 * und muss den Befund bestätigen. Fängt Schatten, Reflexe und Möbel ab.
 */
export async function reviewFinding(finding: Finding, image: NormalizedImage): Promise<{ confirmed: boolean; reason: string }> {
  const { crop } = await cropRegion(image, finding.box, 0.4);
  const { client, model } = visionModel();
  const res = await client.chat.completions.create({
    model,
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `A move-out inspector claims this close-up shows: "${finding.label}" (${finding.classification}, ${finding.severity}) — ${finding.description}
Be skeptical. Is this defect clearly visible in the image and correctly described? Shadows, reflections, wood grain, texture, furniture or decoration do NOT count. Judge what is visible as real: do not speculate that a defect is a sticker, decal or edited image.
Return ONLY JSON: {"confirmed": true|false, "reason": "one short sentence"}`,
        },
        { type: "image_url", image_url: { url: crop.dataUrl } },
      ],
    }],
  });
  try {
    const parsed = parseJsonLoose(res.choices[0]?.message?.content ?? "") as { confirmed?: unknown; reason?: unknown };
    return { confirmed: parsed.confirmed === true, reason: String(parsed.reason ?? "").slice(0, 200) };
  } catch {
    return { confirmed: false, reason: "Review returned no valid JSON" };
  }
}

/**
 * Reine Code-Checks am Report. Jede Meldung ist eine Anweisung an den Agenten,
 * was er noch tun muss.
 */
export function checkReport(args: {
  findings: Finding[];
  shareInputs: ShareInput[] | null;
  lines: ShareLine[];
  totals: ShareTotals | null;
  lifespans: Lifespan[];
  claims: InspectionRequest["landlordClaims"];
  /** Gibt es Einzugsfotos für den Raum dieses Befunds? */
  hasMoveIn?: (f: Finding) => boolean;
}): string[] {
  const issues: string[] = [];
  const damage = args.findings.filter((f) => f.classification === "damage" && f.status !== "rejected");

  for (const f of damage) {
    if (!f.evidence) issues.push(`Finding ${f.id} ("${f.label}") has no SAM mask — run segment_findings or reject it.`);
    if (!f.review) issues.push(`Finding ${f.id} ("${f.label}") was not reviewed — run review_findings.`);
    if (f.status === "confirmed" && !f.moveIn && args.hasMoveIn?.(f)) issues.push(`Finding ${f.id} ("${f.label}") has move-in photos of its room but was not compared — run compare_move_in.`);
  }
  if (!args.shareInputs || !args.totals) {
    issues.push("compute_share has not been run yet.");
    return issues;
  }
  const lineClaims = args.lines.map((l) => l.claimId).filter((id): id is string => Boolean(id));
  for (const claim of args.claims) {
    const count = lineClaims.filter((id) => id === claim.id).length;
    if (count !== 1) issues.push(`Landlord claim ${claim.id} ("${claim.description}") must appear in exactly one share line (found ${count}).`);
  }
  const usable = new Set(args.findings.filter((f) => f.status === "confirmed").map((f) => f.id));
  for (const line of args.lines) {
    const bad = line.findingIds.filter((id) => !usable.has(id));
    if (bad.length) issues.push(`Share line for ${line.claimId ?? line.component} references unconfirmed or unknown findings: ${bad.join(", ")}.`);
  }
  // Summen unabhängig nachrechnen
  const recomputed = computeShares(args.shareInputs, args.lifespans, args.totals.currency).totals;
  if (recomputed.tenantPays !== args.totals.tenantPays || recomputed.claimed !== args.totals.claimed) {
    issues.push("Totals do not match an independent recomputation.");
  }
  return issues;
}
