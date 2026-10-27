import ch from "../../data/rules/ch.json";
import generic from "../../data/rules/generic.json";
import type { Lifespan } from "@/lib/fair-share";

export interface RulePack {
  id: "ch" | "generic";
  name: string;
  isEstimate: boolean;
  source: { title: string; url: string; retrieved: string; note?: string } | null;
  shareRule: string;
  lifespans: Lifespan[];
  normalWearExamples: string[];
}

const PACKS: Record<RulePack["id"], RulePack> = {
  ch: ch as RulePack,
  generic: generic as RulePack,
};

export function getRulePack(id: RulePack["id"]): RulePack {
  return PACKS[id];
}
