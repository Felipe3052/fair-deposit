import { z } from "zod";

export const designRequestSchema = z.object({
  /** Raumfoto als Base64 (ohne data-URL-Präfix) oder mit data:image/...;base64, Präfix */
  imageBase64: z.string().min(100),
  style: z.string().min(1).max(120),
  budgetChf: z.number().positive().max(100_000),
});

export type DesignRequest = z.infer<typeof designRequestSchema>;

// ---------------------------------------------------------------------------
// Ergebnisse der Pipeline-Schritte
// ---------------------------------------------------------------------------

export interface RoomAnalysis {
  roomType: string;
  dimensionsEstimate: string;
  currentFurniture: string[];
  colorPalette: string[];
  lighting: string;
  styleNotes: string;
}

export interface BudgetPlan {
  totalChf: number;
  allocation: { category: string; maxChf: number; share: number }[];
}

export interface Product {
  id: string;
  title: string;
  category: string;
  priceChf: number;
  imageUrl: string | null;
  sourceUrl: string;
}

export interface ShoppingList {
  items: (Product & { reason: string })[];
  totalChf: number;
  budgetChf: number;
  withinBudget: boolean;
}

export interface DesignVerification {
  imageListConsistent: boolean;
  withinBudget: boolean;
  issues: string[];
}

export interface AgentStep {
  tool: string;
  summary: string;
  at: string;
}

export interface DesignSession {
  id: string;
  request: { style: string; budgetChf: number };
  analysis: RoomAnalysis;
  budgetPlan: BudgetPlan;
  shoppingList: ShoppingList;
  redesignImageUrl: string;
  verification: DesignVerification;
  agentSteps: AgentStep[];
  modelCalls: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SSE-Events (DesignResult-Stream)
// ---------------------------------------------------------------------------

export type DesignEvent =
  | { type: "step"; tool: string; summary: string }
  | { type: "analysis"; data: RoomAnalysis }
  | { type: "budgetPlan"; data: BudgetPlan }
  | { type: "image"; dataUrl: string }
  | { type: "list"; data: ShoppingList }
  | { type: "done"; data: DesignSession }
  | { type: "error"; message: string };
