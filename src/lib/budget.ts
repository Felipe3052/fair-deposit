import { USD_CHF_RATE } from "@/lib/currency";

export interface BudgetAllocation {
  category: string;
  maxChf: number;
  share: number;
}

export { USD_CHF_RATE } from "@/lib/currency";

export function toChf(usd: number): number {
  return Math.round(usd * USD_CHF_RATE * 100) / 100;
}

export function sumChf(pricesChf: number[]): number {
  return Math.round(pricesChf.reduce((a, b) => a + b, 0) * 100) / 100;
}

/**
 * Heuristischer Budget-Split über Möbel-Kategorien (programmatisch, kein LLM).
 * Gibt nur Allokationen für Kategorien zurück, die im Katalog existieren.
 */
export function planBudget(
  budgetChf: number,
  availableCategories: string[]
): BudgetAllocation[] {
  const shares: Record<string, number> = {
    sofa: 0.38,
    armchair: 0.08,
    coffee_table: 0.06,
    side_table: 0.03,
    table: 0.03,
    tv_unit: 0.07,
    bookcase: 0.07,
    storage: 0.04,
    dining: 0.06,
    lamp: 0.05,
    rug: 0.05,
    curtain: 0.03,
    textile: 0.02,
    mirror: 0.02,
    decor: 0.04,
    cushion: 0.02,
    shelf: 0.02,
  };
  const have = new Set(availableCategories);
  const alloc = Object.entries(shares)
    .filter(([cat]) => have.has(cat))
    .map(([category, share]) => ({
      category,
      share,
      maxChf: Math.round(budgetChf * share * 100) / 100,
    }));
  // Normalisieren auf 100% der existierenden Kategorien
  const total = alloc.reduce((a, b) => a + b.share, 0);
  return alloc.map((a) => ({
    category: a.category,
    share: Math.round((a.share / total) * 1000) / 1000,
    maxChf: Math.round(((a.share / total) * budgetChf) * 100) / 100,
  }));
}

/** Strikte Budget-Prüfung (reiner Code, kein LLM). */
export function checkBudget(
  totalChf: number,
  budgetChf: number
): { withinBudget: boolean; remaining: number } {
  return {
    withinBudget: totalChf <= budgetChf,
    remaining: Math.round((budgetChf - totalChf) * 100) / 100,
  };
}
