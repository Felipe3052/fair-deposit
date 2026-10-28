import type { Finding } from "@/lib/agent/types";
import type { ShareLine, ShareTotals } from "@/lib/fair-share";

/**
 * Antwortbrief an die Vermieterin / den Vermieter — deterministisch aus dem Report.
 * Beträge und Begründungen kommen aus der Fair-Share-Rechnung, nie aus dem Modell.
 */
export interface LetterInput {
  lines: ShareLine[];
  totals: ShareTotals;
  findings: Finding[];
  photoRooms: Record<string, string>;
  rule: { name: string; isEstimate: boolean; title: string | null; url: string | null };
  moveOutDate: string;
}

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

function evidenceFor(line: ShareLine, input: LetterInput): string {
  const linked = line.findingIds.map((id) => input.findings.find((f) => f.id === id)).filter((f): f is Finding => Boolean(f));
  if (!linked.length) return "";
  return linked
    .map((f) => {
      const room = input.photoRooms[f.photoId] ?? "photo";
      const moveIn = f.moveIn?.verdict === "pre_existing" ? ` — already visible in my move-in photos (${f.moveIn.reason})` : "";
      return `${f.label} (${room})${moveIn}`;
    })
    .join("; ");
}

function paragraph(line: ShareLine, input: LetterInput): string {
  const c = input.totals.currency;
  const title = line.claimDescription ?? `Damage without a claim: ${line.component.replace(/_/g, " ")}`;
  const claimed = line.claimedAmount !== null ? money(line.claimedAmount, c) : "no amount";
  const evidence = evidenceFor(line, input);
  const owe = line.tenantPays !== null ? money(line.tenantPays, c) : "to be clarified";
  const reasons: Record<ShareLine["status"], string> = {
    damage: `I accept that this is damage. However, the ${line.lifespanLabel?.toLowerCase() ?? "component"} was ${line.ageYears} years old with a lifespan of ${line.lifespanYears} years, so only its residual value of ${Math.round((line.residualShare ?? 0) * 100)}% can be charged.`,
    normal_wear: "This is normal wear and tear from ordinary use, which is covered by the rent.",
    pre_existing: "This damage already existed when I moved in, as my move-in photos show. I am not liable for it.",
    no_evidence: "I could not find this damage in my move-out photos. Please send me photos or a report documenting it.",
    age_unknown: "The age of this component still needs to be clarified before a residual value can be calculated. Please tell me when it was last renewed.",
    lifespan_unknown: "Please specify which component this is so the residual value can be calculated.",
  };
  return `**${title}** — you claimed ${claimed}; I owe ${owe}.\n${reasons[line.status]}${evidence ? `\nEvidence: ${evidence}.` : ""}`;
}

export function buildLetter(input: LetterInput): string {
  const c = input.totals.currency;
  const saved = input.totals.claimed - input.totals.tenantPays;
  const source = input.rule.isEstimate
    ? `${input.rule.name} (an estimate, not a legal table)`
    : `${input.rule.title ?? input.rule.name}${input.rule.url ? ` (${input.rule.url})` : ""}`;
  return [
    "[Your name]",
    "[Your address]",
    "",
    "[Landlord's name]",
    "[Landlord's address]",
    "",
    `[City], [Date]`,
    "",
    `**Re: Your claims after my move-out on ${input.moveOutDate}**`,
    "",
    "Dear [Landlord's name],",
    "",
    `Thank you for your list of claims totalling ${money(input.totals.claimed, c)}. I have reviewed each item against my move-out photos${input.findings.some((f) => f.moveIn) ? " and my move-in photos" : ""} and against the usual lifespans of the affected components (${source}). My assessment is as follows:`,
    "",
    ...input.lines.flatMap((line) => [paragraph(line, input), ""]),
    `**In total I acknowledge ${money(input.totals.tenantPays, c)}** of the ${money(input.totals.claimed, c)} claimed (difference: ${money(saved, c)}).${input.totals.openLines ? ` ${input.totals.openLines} item(s) still need to be clarified as noted above.` : ""} Please deduct only this amount from my deposit and return the remainder.`,
    "",
    "I have attached an evidence report with the marked photos for each item. I am happy to discuss any point.",
    "",
    "Kind regards,",
    "",
    "[Your name]",
  ].join("\n");
}
