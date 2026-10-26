# Architektur — AI Interior Designer

## Stack-Entscheidung

**Ein einziges Next.js-Full-Stack-Projekt** (App Router + API Routes, TypeScript) statt Frontend + separates Python-Backend.

Begründung:
- Ein Service = ein Deployment (Vercel-ready), keine CORS-/Proxy-Themen — wichtig für einen funktionierenden Live-Demo-Tag.
- Meta Model API ist **OpenAI-SDK-kompatibel** (`base_url: https://api.meta.ai/v1`) — offizieller TypeScript-SDK-Support, ein Sprach-Stack reicht.
- 10-Tage-Fenster: jede Schnittstelle weniger ist ein Tag gewonnen.

Alternative (verworfen): Streamlit — am schnellsten, aber die Demo-/Produktqualität von Next.js zählt 25% der Bewertung; Vercel-Hosting ist kostenlos.

## Pipeline (Happy Path)

```
┌──────────┐   1. Upload Foto      ┌─────────────────────────────────────────┐
│ Browser  │ ────────────────────▶ │ POST /api/analyze                       │
│ (page)   │                       │ muse-spark-1.3 Vision:                  │
└──────────┘                       │  → Raumtyp, Stilmerkmale, Farbpalette,  │
                                   │    vorhandene Möbel, Beleuchtung (JSON) │
                                   └────────────────┬────────────────────────┘
                                                    │ 2. RoomAnalysis
                                   ┌────────────────▼────────────────────────┐
                                   │ POST /api/redesign                      │
                                   │ muse-image-1.0 image-to-image Edit:     │
                                   │  → visualisiertes Redesign (Bild)       │
                                   └────────────────┬────────────────────────┘
                                                    │ 3. RedesignImage
                                   ┌────────────────▼────────────────────────┐
                                   │ POST /api/products                      │
                                   │ muse-spark-1.3 Structured Output:       │
                                   │  → passende Produkt-IDs aus lokalem     │
                                   │    Katalog (reale Daten, kein Halluz.)  │
                                   │ + Budget-Filter + Summe (programmatisch)│
                                   └────────────────┬────────────────────────┘
                                                    │ 4. ShoppingList
                                   ┌────────────────▼────────────────────────┐
                                   │ UI: Before/After + Einkaufsliste        │
                                   │ (Bild, Name, Preis CHF, IKEA-Link)      │
                                   └─────────────────────────────────────────┘
```

**Anti-Halluzinierung (Kernprinzip):** Das Modell wählt nur aus **vorhandenen Katalog-Einträgen** (per ID referenziert). Preise, Namen, Links kommen **ausschliesslich aus der Datenbank**, nie aus dem Modell. Die Gesamtsumme wird in Code berechnet, nicht vom Modell.

## Meta Model API Integration

OpenAI-SDK mit umgebogenem Base URL:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1",
  apiKey: process.env.MODEL_API_KEY,
});
```

| Zweck | Modell | Modus | Anmerkung |
|---|---|---|---|
| Raum-Analyse, Produkt-Auswahl | `muse-spark-1.3` | Chat/Responses API, Structured Output (JSON Schema) | 1M Kontext; Vision via `input_image` (Base64 data URL) |
| Raum-Redesign | `muse-image-1.0` | `/v1/images/edits` (image-to-image) | Originalfoto + Stil/Budget-Prompt → bearbeitetes Bild |
| Optional: Möbel-Masken | SAM 3.1 | API | Segmentierung vorhandener Möbel → "was bleibt / was wird ersetzt"-Overlay |

Kosten (~$150 Credits, Standard-Mode): Spark $1.25/M input, $4.25/M output Tokens; Muse Image $0.01/Bild. Ein kompletter Durchlauf liegt im Cent-Bereich.

## Datenmodelle (TypeScript)

```typescript
// 1. Request des Nutzers
interface DesignRequest {
  image: File;                 // Raumfoto
  style: string;               // z.B. "skandinavisch", "modern", "boho"
  budgetChf: number;           // Budget in CHF
}

// 2. Ergebnis der Vision-Analyse (Structured Output, Schema erzwungen)
interface RoomAnalysis {
  roomType: string;            // "living_room" (Prototyp-Fokus)
  dimensionsEstimate: string;  // grobe Einschätzung, klar als Schätzung markiert
  currentFurniture: string[];  // erkannte Möbelstücke
  colorPalette: string[];      // Hex-Codes
  lighting: string;            // "hell", "dimmig", ...
  styleNotes: string;          // bestehende Merkmale, die erhalten bleiben sollen
}

// 3. Katalog-Produkt (aus data/catalog.json — Quelle: IKEA-Datensatz)
interface Product {
  id: string;                  // IKEA product_id
  title: string;               // echter Produktname
  category: string;            // normalisierte Kategorie (sofa, table, lamp, ...)
  priceUsd: number;
  priceChf: number;            // mit fixem Kurs konvertiert (siehe DATA-SOURCES.md)
  currency: "CHF";
  imageUrl: string;            // echtes Produktbild
  sourceUrl: string;           // echte IKEA-Produktseite
  dimensions?: string;
}

// 4. Ergebnis der Produkt-Auswahl
interface ShoppingList {
  items: (Product & { reason: string })[];  // reason: kurze Begründung des Modells
  totalChf: number;                          // programmatisch berechnet
  budgetChf: number;
  withinBudget: boolean;
}

// 5. DesignSession (Client-State / Persistenz-Kandidat)
interface DesignSession {
  id: string;
  request: DesignRequest;
  analysis: RoomAnalysis;
  redesignImageUrl: string;
  shoppingList: ShoppingList;
  createdAt: string;
}
```

## API-Schnittstellen

| Route | Methode | Input | Output | Modell-Aufruf |
|---|---|---|---|---|
| `/api/analyze` | POST | multipart: image | `RoomAnalysis` | muse-spark (Vision) |
| `/api/redesign` | POST | JSON: base64 image + style + budget | `{ redesignImageUrl }` | muse-image (edit) |
| `/api/products` | POST | JSON: analysis + style + budgetChf | `ShoppingList` | muse-spark (Structured Output) |
| `/api/session` | POST/GET | — | `DesignSession` speichern/laden | — (optional, Phase 3) |

Alle Routen validieren Inputs (zod) und kapseln API-Keys serverseitig.

## Projektmodul-Verantwortlichkeiten (`src/lib/`)

- `meta-client.ts` — Singleton OpenAI-Client, Retry, Timeout
- `room-analysis.ts` — Prompt + JSON-Schema für die Raum-Analyse
- `redesign.ts` — Bild-Edit-Call (Originalfoto + Stilbeschreibung)
- `catalog.ts` — Katalog laden, nach Kategorie/Preis filtern, ID-Lookup
- `budget.ts` — USD→CHF, Summen, Budget-Einhaltung

## Erweiterungspunkte (nur wenn Zeit)

- SAM 3.1-Overlay (Before/After mit Segmentierung → starker Meta-Tooling-Bonus)
- Design-Session-Historie (localStorage oder SQLite)
- Weitere Raumtypen (Schlafzimmer, Küche)
