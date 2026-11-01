/**
 * Fair-Share-Rechnung — reiner Code, kein Modell.
 * Mieter zahlt bei echtem Schaden nur den Restwert des Bauteils:
 * Forderung × max(0, 1 − Alter / Lebensdauer). Normale Abnutzung: 0.
 * Bewusst ohne Pfad-Aliase, damit `node --test` die Datei direkt laden kann.
 */

export const COMPONENT_TYPES = [
  "wall_paint", "wallpaper", "carpet", "laminate", "vinyl", "parquet_finish", "parquet_solid",
  "tiles", "kitchen_counter", "door", "window", "bathroom_fixture", "appliance", "other",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export interface Lifespan {
  component: ComponentType;
  /** Material-/Qualitätsvariante; ohne variant = Standardwert des Bauteils */
  variant?: string;
  years: number;
  label: string;
}

export function findLifespan(lifespans: Lifespan[], component: ComponentType, variant?: string | null): Lifespan | null {
  return (
    (variant ? lifespans.find((l) => l.component === component && l.variant === variant) : undefined) ??
    lifespans.find((l) => l.component === component && !l.variant) ??
    null
  );
}

export interface ShareInput {
  claimId: string | null;
  claimDescription: string | null;
  claimedAmount: number | null;
  component: ComponentType;
  variant?: string | null;
  /** Klassifikation der verknüpften, bestätigten Befunde */
  findingClassifications: ("normal_wear" | "damage" | "pre_existing")[];
  findingIds: string[];
  /** Alter des Bauteils in Jahren; null = unbekannt */
  ageYears: number | null;
}

export type ShareStatus =
  | "normal_wear"   // nur Abnutzung → Mieter zahlt nichts
  | "pre_existing"  // Schaden war laut Einzugsfotos schon da → Mieter zahlt nichts
  | "damage"        // Schaden, Restwert berechnet
  | "no_evidence"   // Forderung ohne belegten Befund
  | "age_unknown"   // Schaden, aber Alter fehlt
  | "lifespan_unknown"; // Bauteil nicht im Rule Pack

export interface ShareLine extends ShareInput {
  status: ShareStatus;
  lifespanYears: number | null;
  lifespanLabel: string | null;
  residualShare: number | null;
  /** null = nicht berechenbar (siehe status) */
  tenantPays: number | null;
  explanation: string;
}

export interface ShareTotals {
  claimed: number;
  tenantPays: number;
  /** Positionen, bei denen tenantPays nicht berechenbar war */
  openLines: number;
  currency: string;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Alter in Jahren (mit Nachkommastellen) zwischen Einbaujahr und Auszugsdatum. */
export function ageFromInstalledYear(installedYear: number, moveOutDate: string): number {
  const moveOut = new Date(moveOutDate);
  const years = moveOut.getUTCFullYear() + moveOut.getUTCMonth() / 12 - installedYear;
  return Math.max(0, Math.round(years * 10) / 10);
}

export function computeShareLine(input: ShareInput, lifespans: Lifespan[]): ShareLine {
  const lifespan = findLifespan(lifespans, input.component, input.variant);
  const base = { ...input, lifespanYears: lifespan?.years ?? null, lifespanLabel: lifespan?.label ?? null, residualShare: null, tenantPays: null };

  if (input.findingIds.length === 0) {
    return {
      ...base,
      status: "no_evidence",
      explanation: "No confirmed finding in the photos supports this claim. Ask the landlord for evidence.",
    };
  }
  if (!input.findingClassifications.includes("damage") && input.findingClassifications.includes("pre_existing")) {
    return {
      ...base,
      tenantPays: 0,
      status: "pre_existing",
      explanation: "This damage is already visible in the move-in photos. The tenant is not liable for it.",
    };
  }
  if (!input.findingClassifications.includes("damage")) {
    return {
      ...base,
      tenantPays: 0,
      status: "normal_wear",
      explanation: "Only normal wear was found. Normal wear is covered by the rent.",
    };
  }
  if (!lifespan) {
    return {
      ...base,
      status: "lifespan_unknown",
      explanation: `No lifespan for "${input.component}" in this rule pack. Check your local rules.`,
    };
  }
  if (input.ageYears === null) {
    return {
      ...base,
      status: "age_unknown",
      explanation: `Damage confirmed. Enter the component's age to compute the residual value (lifespan ${lifespan.years} years).`,
    };
  }
  const residualShare = Math.max(0, Math.min(1, 1 - input.ageYears / lifespan.years));
  const tenantPays = input.claimedAmount === null ? null : roundMoney(input.claimedAmount * residualShare);
  const pct = Math.round(residualShare * 100);
  return {
    ...base,
    residualShare,
    tenantPays,
    status: "damage",
    explanation: residualShare === 0
      ? `Damage confirmed, but the ${lifespan.label.toLowerCase()} is ${input.ageYears} years old and its lifespan of ${lifespan.years} years has run out: nothing owed.`
      : `Damage confirmed. ${lifespan.label}: age ${input.ageYears} of ${lifespan.years} years → residual value ${pct}% of the claim.`,
  };
}

export function computeShares(
  inputs: ShareInput[],
  lifespans: Lifespan[],
  currency: string
): { lines: ShareLine[]; totals: ShareTotals } {
  const lines = inputs.map((input) => computeShareLine(input, lifespans));
  const claimed = roundMoney(lines.reduce((sum, l) => sum + (l.claimedAmount ?? 0), 0));
  const tenantPays = roundMoney(lines.reduce((sum, l) => sum + (l.tenantPays ?? 0), 0));
  const openLines = lines.filter((l) => l.tenantPays === null && l.status !== "no_evidence").length;
  return { lines, totals: { claimed, tenantPays, openLines, currency } };
}
