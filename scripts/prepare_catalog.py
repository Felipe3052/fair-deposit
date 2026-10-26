#!/usr/bin/env python3
"""Bereitet den IKEA-US-Datensatz zu einem schlanken Produktkatalog auf.

Input : data/raw/products-us.jsonl  (jeffreyszhou/ikea-us-products-2025)
Output: data/catalog.json           (Wohnzimmer-relevante Produkte, normalisiert)

Prinzip: Alle Felder (Titel, Preis, Bild, Link) kommen 1:1 aus dem Datensatz —
es wird nichts erfunden, nur gefiltert und normalisiert.

Ausführen (im Projektroot):
    python scripts/prepare_catalog.py
"""

import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Konfiguration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = ROOT / "data" / "raw" / "products-us.jsonl"
OUTPUT_PATH = ROOT / "data" / "catalog.json"

# Max. Budget-Preis-Deckel (USD) — über diesem Wert für den Prototyp uninteressant
MAX_PRICE_USD = 3000.0

# Wohnzimmer-relevante Kategorie-Stichworte aus der category_tree des Datensatzes.
# (Reihenfolge = Priorität bei der Kategoriesierung.)
CATEGORY_RULES = [
    ("sofa",        ["sofas", "sectional sofas", "futons"]),
    ("armchair",    ["armchairs", "accent chairs", "chaise lounges"]),
    ("coffee_table",["coffee & side tables", "coffee tables"]),
    ("side_table",  ["side tables", "nesting tables"]),
    ("tv_unit",     ["tv stands", "media storage", "tv & media furniture"]),
    ("bookcase",    ["bookcases", "shelving units", "cabinets & sideboards"]),
    ("dining",      ["dining tables", "dining chairs", "dining sets"]),
    ("lamp",        ["floor lamps", "table lamps", "pendant lighting", "ceiling lights", "wall lamps"]),
    ("rug",         ["rugs"]),
    ("curtain",     ["curtains & blinds", "curtains"]),
    ("mirror",      ["mirrors"]),
    ("decor",       ["picture & photo frames", "vases", "candles", "candle holders",
                     "plants & pots", "plant pots", "wall décor", "clocks"]),
    ("cushion",     ["cushions", "cushion covers", "throws"]),
    ("shelf",       ["wall shelves", "shelf units"]),
]

# Bilder liegen im Datensatz als lokale Pfade ("images-us/<file>.jpg").
# HF-Resolver-Basis, um die Bilder remote zu laden (Repo-Typ dataset, main-Branch):
HF_RESOLVE = "https://huggingface.co/datasets/jeffreyszhou/ikea-us-products-2025/resolve/main/"


def normalize_category(category_tree: list[str]) -> str:
    """Mappt die IKEA-Kategorie-Hierarchie auf unsere Prototyp-Kategorien."""
    joined = " / ".join(category_tree).lower()
    for cat, keywords in CATEGORY_RULES:
        if any(k in joined for k in keywords):
            return cat
    return "other"


def parse_price(raw: object) -> float | None:
    """'399' | '9.99' | '599.00' -> float; ungültig -> None."""
    if raw is None:
        return None
    try:
        return round(float(str(raw).replace(",", "")), 2)
    except (ValueError, TypeError):
        return None


def image_url(entry: dict) -> str | None:
    """Liefert eine ladbares Bild-URL: HF-Resolver für lokale Pfade, sonst http(s)."""
    urls = entry.get("image_urls") or []
    if not urls:
        return None
    first = str(urls[0]).strip()
    if first.startswith(("http://", "https://")):
        return first
    if first.startswith("images-us/"):
        return HF_RESOLVE + first
    return None


def main() -> int:
    if not INPUT_PATH.exists():
        print(f"Fehler: {INPUT_PATH} nicht gefunden.")
        print("Datensatz zuerst herunterladen (siehe data/README.md):")
        print("  hf download jeffreyszhou/ikea-us-products-2025 products-us.jsonl "
              "--repo-type dataset --local-dir data/raw")
        return 1

    catalog: list[dict] = []
    seen_ids: set[str] = set()
    skipped = 0

    with INPUT_PATH.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue

            product_id = str(entry.get("product_id") or "").strip()
            price = parse_price(entry.get("price"))
            src = str(entry.get("source_url") or "").strip()
            title = str(entry.get("title") or "").strip()
            img = image_url(entry)

            # Nur gültige Einträge: ID, Titel, Preis, echter Produktlink
            if not product_id or product_id in seen_ids:
                skipped += 1
                continue
            if not title or price is None or price <= 0 or price > MAX_PRICE_USD:
                skipped += 1
                continue
            if not src.startswith("http") or "ikea.com" not in src:
                skipped += 1
                continue

            seen_ids.add(product_id)
            catalog.append({
                "id": product_id,
                "title": title,
                "category": normalize_category(entry.get("category_tree") or []),
                "priceUsd": price,
                "imageUrl": img,          # kann None sein -> UI behandelt Fallback
                "sourceUrl": src,
                "materials": entry.get("materials") or [],
            })

    catalog.sort(key=lambda p: (p["category"], p["priceUsd"]))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"currency": "USD", "source": "ikea-us-products-2025 (Juli 2025)",
                    "count": len(catalog), "products": catalog}, ensure_ascii=False),
        encoding="utf-8",
    )

    by_cat: dict[str, int] = {}
    for p in catalog:
        by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1

    print(f"OK: {len(catalog)} Produkte -> {OUTPUT_PATH.relative_to(ROOT)}")
    print(f"Übersprungen: {skipped}")
    for cat, n in sorted(by_cat.items(), key=lambda kv: -kv[1]):
        print(f"  {cat:<13} {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
