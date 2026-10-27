import fs from "fs";
import path from "path";
import { USD_CHF_RATE } from "@/lib/currency";

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

function resolveCatalogImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const datasetImage = value.match(
    /^https:\/\/huggingface\.co\/datasets\/jeffreyszhou\/ikea-us-products-2025\/resolve\/main\/images-us\/([\w.-]+)$/i
  );
  if (datasetImage) {
    return `https://www.ikea.com/us/en/images/products/${datasetImage[1]}`;
  }
  return value;
}

/** Lädt data/catalog.json einmal und cached (kein wiederholtes Disk-I/O). */
export function loadCatalog(): CatalogProduct[] {
  if (_catalog) return _catalog;
  const p = path.join(process.cwd(), "data", "catalog.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  _catalog = (raw.products as Array<Record<string, unknown>>).map((e) => {
    const priceUsd = Number(e.priceUsd);
    return {
      id: String(e.id),
      title: String(e.title),
      category: String(e.category),
      priceUsd,
      priceChf: Math.round(priceUsd * USD_CHF_RATE * 100) / 100,
      imageUrl: resolveCatalogImageUrl(e.imageUrl),
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
  const eligible = loadCatalog()
    .filter((p) => cats.size === 0 || cats.has(p.category))
    .filter((p) => p.priceChf > 0 && p.priceChf <= args.maxChf);
  const categories = cats.size
    ? [...cats]
    : [...new Set(eligible.map((p) => p.category))].sort();
  const groups = categories
    .map((category) =>
      eligible
        .filter((product) => product.category === category)
        .sort((a, b) => a.priceChf - b.priceChf)
    )
    .filter((products) => products.length > 0);

  const samplePriceTiers = (
    products: CatalogProduct[],
    limit: number
  ): CatalogProduct[] => {
    if (products.length <= limit) return products;
    if (limit <= 1) return [products[Math.floor(products.length / 2)]];
    return Array.from({ length: limit }, (_, index) => {
      const sourceIndex = Math.round(
        (index * (products.length - 1)) / (limit - 1)
      );
      return products[sourceIndex];
    });
  };

  // Reserve options for every requested category, then sample across the full
  // price range so the agent can compare budget and mid/high-priced products.
  const selected: CatalogProduct[] = [];
  let remaining = cap;
  for (let index = 0; index < groups.length && remaining > 0; index++) {
    const groupsLeft = groups.length - index;
    const groupLimit = Math.ceil(remaining / groupsLeft);
    const options = samplePriceTiers(groups[index], groupLimit);
    selected.push(...options);
    remaining -= options.length;
  }
  return selected;
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
