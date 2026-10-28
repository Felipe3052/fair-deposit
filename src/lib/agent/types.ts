import { z } from "zod";
import type { ComponentType, ShareLine, ShareTotals } from "../fair-share";

export type { ComponentType, ShareLine, ShareTotals } from "../fair-share";
export { COMPONENT_TYPES } from "../fair-share";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

const componentSchema = z.enum([
  "wall_paint", "wallpaper", "carpet", "laminate", "vinyl", "parquet_finish", "parquet_solid",
  "tiles", "kitchen_counter", "door", "window", "bathroom_fixture", "appliance", "other",
]);

export const inspectionRequestSchema = z.object({
  rulePack: z.enum(["ch", "generic"]),
  currency: z.string().trim().min(1).max(8).default("CHF"),
  tenancyStart: z.iso.date(),
  moveOutDate: z.iso.date(),
  /** Bekanntes Baujahr/Renovationsjahr einzelner Bauteile; sonst gilt der Mietbeginn nicht automatisch. */
  components: z.array(z.object({
    component: componentSchema,
    /** Material-/Qualitätsvariante laut Rule Pack (z.B. "acrylic"); nur vom Mieter, nie vom Modell */
    variant: z.string().trim().max(40).optional(),
    installedYear: z.number().int().min(1900).max(2100),
  })).max(20).default([]),
  photos: z.array(z.object({
    id: z.string().trim().min(1).max(40),
    room: z.string().trim().min(1).max(60),
    kind: z.enum(["move_out", "move_in"]).default("move_out"),
    /** data:image/...;base64 */
    imageBase64: z.string().min(100),
  })).min(1).max(12),
  landlordClaims: z.array(z.object({
    id: z.string().trim().min(1).max(40),
    description: z.string().trim().min(1).max(200),
    amount: z.number().nonnegative().max(1_000_000),
  })).max(30).default([]),
});

export type InspectionRequest = z.infer<typeof inspectionRequestSchema>;

// ---------------------------------------------------------------------------
// Befunde
// ---------------------------------------------------------------------------

/** Pixel im normalisierten Foto; right/bottom halboffen (wie SAM-Box-Records). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const FINDING_CATEGORIES = [
  "hole", "scratch", "stain", "crack", "marks", "water_damage", "mold", "peeling_paint", "other",
] as const;

export interface MaskShape {
  /** SVG-Pfad im Raster der Maske (width × height); Platzierung über bounds. */
  path: string;
  width: number;
  height: number;
  bounds: Box;
}

export interface Evidence {
  /** Konzept-Prompts liefern evtl. mehrere Teilmasken (z.B. einzelne Kratzer). */
  masks: MaskShape[];
  strategy: "box" | "concept";
  samConfidence: number | null;
}

export interface Finding {
  id: string;
  photoId: string;
  label: string;
  category: (typeof FINDING_CATEGORIES)[number];
  component: ComponentType;
  classification: "normal_wear" | "damage";
  severity: "minor" | "moderate" | "severe";
  description: string;
  box: Box;
  confidence: number;
  /** "zoom" = beim Hineinzoomen gefunden */
  source: "overview" | "zoom";
  evidence?: Evidence;
  /** Ergebnis der Vision-Gegenprüfung */
  review?: { confirmed: boolean; reason: string };
  status: "pending" | "confirmed" | "unconfirmed" | "rejected";
}

export interface PhotoMeta {
  id: string;
  room: string;
  kind: "move_out" | "move_in";
  width: number;
  height: number;
}

export interface AgentStep {
  tool: string;
  summary: string;
  at: string;
}

export interface InspectionReport {
  id: string;
  rulePack: { id: string; name: string; isEstimate: boolean; sourceTitle: string | null; sourceUrl: string | null };
  photos: PhotoMeta[];
  findings: Finding[];
  lines: ShareLine[];
  totals: ShareTotals;
  verification: { passed: boolean; issues: string[] };
  agentSteps: AgentStep[];
  modelCalls: number;
  /** Tatsächlich verwendete Modelle; openWeights = Muse Spark Open über Baseten */
  models: { agent: string; vision: string; segmentation: string; openWeights: boolean };
  disclaimer: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SSE-Events
// ---------------------------------------------------------------------------

export type InspectionEvent =
  | { type: "step"; tool: string; summary: string }
  | { type: "photos"; data: PhotoMeta[] }
  | { type: "finding"; data: Finding }
  | { type: "share"; lines: ShareLine[]; totals: ShareTotals }
  | { type: "verification"; passed: boolean; issues: string[] }
  | { type: "done"; data: InspectionReport }
  | { type: "error"; message: string };
