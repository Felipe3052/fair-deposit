import fs from "fs";
import path from "path";

export interface CatalogProduct {
  id: string;
  title: string;
  category: string;
  priceUsd: number;
  priceChf: number;
  imageUrl: string | null;
  sourceUrl: string;
  materials: string[];
}

let _catalog: CatalogProduct[] | null = null;

/** Lädt data/catalog.json einmal und cached (kein wiederholtes Disk-I/O). */
export function loadCatalog(): CatalogProduct[] {
  if (_catalog) return _catalog;
  const p = path.join(process.cwd(), "data", "catalog.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const rate = Number(process.env.USD_CHF_RATE ?? 0.88);
  _catalog = (raw.products as Array<Record<string, unknown>>).map((e) => {
    const priceUsd = Number(e.priceUsd);
    return {
      id: String(e.id),
      title: String(e.title),
      category: String(e.category),
      priceUsd,
      priceChf: Math.round(priceUsd * rate * 100) / 100,
      imageUrl: (e.imageUrl as string | null) ?? null,
      sourceUrl: String(e.sourceUrl),
      materials: (e.materials as string[]) ?? [],
    };
  });
  return _catalog;
}

export interface SearchArgs {
  categories: string[];
  maxChf: number;
  limit?: number;
}

/** Lokaler Katalog-Filter — reiner Code, kein LLM. Kompakte Kandidatenliste für den Agenten. */
export function searchCatalog(args: SearchArgs): CatalogProduct[] {
  const cap = Math.min(args.limit ?? 25, 40);
  const cats = new Set(args.categories.map((c) => c.toLowerCase()));
  return loadCatalog()
    .filter((p) => cats.size === 0 || cats.has(p.category))
    .filter((p) => p.priceChf > 0 && p.priceChf <= args.maxChf)
    .sort((a, b) => a.priceChf - b.priceChf)
    .slice(0, cap);
}

/** ID-Lookup mit strikter Validierung: nur existierende Katalog-Einträge. */
export function getProducts(ids: string[]): CatalogProduct[] {
  const byId = new Map(loadCatalog().map((p) => [p.id, p]));
  const out: CatalogProduct[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p); // unbekannte IDs werden stillschweigend verworfen (Anti-Halluzinierung)
  }
  return out;
}

export const CATALOG_CATEGORIES = [
  "sofa", "armchair", "coffee_table", "side_table", "table", "tv_unit",
  "bookcase", "storage", "dining", "lamp", "rug", "curtain", "textile",
  "mirror", "decor", "cushion", "shelf",
];
