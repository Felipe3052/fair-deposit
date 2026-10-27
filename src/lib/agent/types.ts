import { z } from "zod";

export const designRequestSchema = z.object({
  /** Raumfoto als Base64 oder data:image/...;base64 URL */
  imageBase64: z.string().min(100),
  style: z.string().min(1).max(120),
  budgetChf: z.number().positive().max(100_000),
  changeRequest: z.string().trim().max(500),
  furnitureSelection: z.array(z.object({
    id: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
    category: z.enum([
      "sofa", "armchair", "coffee_table", "table", "dining", "bookcase", "lamp", "rug",
    ]),
    action: z.enum(["keep", "replace"]),
  })).min(1).max(40),
});

export type DesignRequest = z.infer<typeof designRequestSchema>;
export type FurnitureSelection = DesignRequest["furnitureSelection"];

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
  request: { style: string; budgetChf: number; changeRequest: string; furnitureSelection: z.infer<typeof designRequestSchema>["furnitureSelection"] };
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
