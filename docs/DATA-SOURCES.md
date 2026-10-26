# Produktdatenquellen

## Hauptquelle: IKEA US Product Dataset (Juli 2025)

**[jeffreyszhou/ikea-us-products-2025](https://huggingface.co/datasets/jeffreyszhou/ikea-us-products-2025)**

- ~30'000 IKEA US-Produkte, gescraped von der **offiziellen ikea.com-Website** (Juli 2025)
- `products-us.jsonl` — ein JSON-Objekt pro Produkt mit:
  - `product_id` (8-stellige IKEA-ID)
  - `title` (echter Produktname)
  - `description`, `category_tree` (Hierarchie), `materials`
  - `price` (USD, Zahl als String)
  - `image_urls` (lokaler Pfad zum Hero-Bild; Bilder separat herunterladbar)
  - `source_url` (kanonische IKEA-Produktseite — echte Händlerlinks ✓)

### Download

```bash
pip install "huggingface_hub[cli]"
hf download jeffreyszhou/ikea-us-products-2025 products-us.jsonl \
  --repo-type dataset --local-dir data/raw
```

Bilder: optional alle Hero-Images herunterladen (`images-us/`) — für den Prototyp reicht der Remote-Image-Resolver von Hugging Face (siehe `prepare_catalog.py`).

### Lizenz-Hinweis (offen, siehe OPEN-QUESTIONS.md)

Die Dataset-Karte nennt keine explizite Lizenz. Die Daten sind faktische Produktangaben (Namen, Preise, URLs) von einer öffentlich zugänglichen Website — für einen Hackathon-Prototyp mit Quellenangabe vertretbar, aber: Quelle im UI/README **kennzeichnen** ("Produktdaten: IKEA US, Juli 2025").

## Alternative Quellen (falls nötig)

| Quelle | Pro | Con |
|---|---|---|
| [crawlfeeds/IKEA-Home-Decor-Furniture-Dataset](https://huggingface.co/datasets/crawlfeeds/IKEA-Home-Decor-Furniture-Dataset) | strukturierte Massangaben, 4-level-Kategorien | nur ~400 Produkte |
| IKEA CH direkt (Scraping) | CHF-Preise, Schweizer Verfügbarkeit | Aufwand, ToS-Risiko, nicht für den 10-Tage-Fenster |
| Pfister / Micasa (CH) | Schweizer Händler, CHF | kein offener Datensatz, Scraping nötig |

## Währung: USD → CHF

- Der Datensatz hat **USD-Preise** (Stand Juli 2025). Kein offener IKEA-CH-Datensatz mit CHF.
- Prototyp-Lösung: fixer Konvertierungskurs (in `src/lib/budget.ts` zentral, z.B. `USD_CHF = 0.88`) + **transparente Kennzeichnung im UI**: "Preise: IKEA US (USD, Juli 2025), umgerechnet zu CHF".
- Für echte CHF-Preise: nach dem Hackathon IKEA CH als Datenquelle anbinden (Dokumentation in OPEN-QUESTIONS.md).

## Anti-Halluzinierungs-Prinzip

Produktnamen, Preise, Bilder und Links kommen **ausschliesslich aus `data/catalog.json`**. Das Modell wählt nur Produkten **per ID** aus dem vorhandenen Katalog aus (Structured Output). Die Gesamtsumme wird in Code berechnet (`budget.ts`), nie vom Modell.
