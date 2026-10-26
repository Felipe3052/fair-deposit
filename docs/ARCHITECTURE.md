# Architektur — AI Interior Designer

## Stack-Entscheidung

**Ein einziges Next.js-Full-Stack-Projekt** (App Router + API Routes, TypeScript) statt Frontend + separates Python-Backend.

Begründung:
- Ein Service = ein Deployment (Vercel-ready), keine CORS-/Proxy-Themen — wichtig für einen funktionierenden Live-Demo-Tag.
- Meta Model API ist **OpenAI-SDK-kompatibel** (`base_url: https://api.meta.ai/v1`) — offizieller TypeScript-SDK-Support, ein Sprach-Stack reicht.
- 10-Tage-Fenster: jede Schnittstelle weniger ist ein Tag gewonnen.

Alternative (verworfen): Streamlit — am schnellsten, aber die Demo-/Produktqualität von Next.js zählt 25% der Bewertung; Vercel-Hosting ist kostenlos.

## Kern-Architektur: Agent-Loop statt starrer Pipeline

**Wettbewerbskern** (siehe docs/POSITIONING.md): `muse-spark` läuft als **Agent mit Tools** — nicht als drei hintereinander geschaltete Calls. Der Agent entscheidet selbst, in welcher Reihenfolge er Werkzeuge braucht, und **iteriert**, bis Budget und Bild-Listen-Konsistenz stimmen.

```
┌──────────┐   Upload Foto, Stil,    ┌──────────────────────────────────────────┐
│ Browser  │   Budget (CHF),         │ POST /api/design  (SSE-Streaming)        │
│ (page)   │   Keep/Replace-Masken   │                                          │
└──────────┘ ─────────────────────▶ │ muse-spark AGENT-LOOP:                   │
                                    │                                          │
                                    │  tool analyze_room        (Vision, JSON) │
                                    │  tool segment_furniture   (SAM 3.1)      │
                                    │  tool plan_budget         (programmatisch)│
                                    │  tool search_catalog      (echter Katalog)│
                                    │  tool edit_room_image     (muse-image)   │
                                    │  tool verify              (Checks)       │
                                    │                                          │
                                    │  → iteriert bis Budget ≤ und Bild ↔ Liste│
                                    └────────────────┬─────────────────────────┘
                                                     │ DesignResult (Stream)
                                    ┌────────────────▼─────────────────────────┐
                                    │ UI: Before/After + Einkaufsliste         │
                                    │ (Bild, Name, Preis CHF, IKEA-Link)       │
                                    └──────────────────────────────────────────┘
```

**Warum Agent statt Pipeline:** Ein starrer Flow "Analyze → Redesign → Products" produziert ein Bild, dessen Möbel nicht zur Liste passen, und eine Liste, die das Budget sprengen kann. Der Agent-Loop behebt beides selbst: Budget überschritten → er wählt günstigere Alternativen und plant neu; Bild passt nicht zu gewähltem Produkt → er re-edited mit Referenzbildern. Das ist der Kern von "beyond a basic integration" (25% Meta-Tooling) und zielt auf den Bonus-Preis "Best Agentic Use-Case".

**Anti-Halluzinierung (Kernprinzip, unverändert):** Das Modell wählt nur aus **vorhandenen Katalog-Einträgen** (per ID referenziert). Preise, Namen, Links kommen **ausschliesslich aus der Datenbank**, nie aus dem Modell. Budget-Split, Summen und Budget-Checks laufen programmatisch in Tools, nicht im Modell.

**Vision-basierte Verifikation (der "überraschende" Moment):** Die Bild-Listen-Konsistenz prüft muse-spark per Vision — er sieht das *generierte* Redesign-Bild und bestätigt, dass die Einkaufslisten-Produkte tatsächlich sichtbar sind. Schlägt der Check fehl, re-edited der Agent mit schärferem Prompt/Referenzbildern. Das Modell wird also als **Verifikator**, nicht nur als Generator benutzt — das schliesst den Loop technisch und ist die stärkste Antwort auf "Did they surface capabilities that surprised even us?".

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
| Agent-Loop (Planung, Produkt-Auswahl, Verifikation) | `muse-spark-1.3` | Responses API mit **Tool Calling** + Structured Output | 1M Kontext; Vision via `input_image` (Base64 data URL) |
| Raum-Redesign | `muse-image-1.0` | `/v1/images/edits` (image-to-image) | Originalfoto + **Referenzbilder der gewählten Produkte** → Edit mit genau diesen Stücken |
| Möbel-Segmentierung | SAM 3.1 | API | Masken für "Behalten / Ersetzen"; steuern den Bild-Edit |
| Optional: Sprachinput | Muse Voice Transcribe | API | "Die Couch bleibt, der Tisch raus" — nur falls Zeit |

Kosten (~$150 Credits, Standard-Mode): Spark $1.25/M input, $4.25/M output Tokens; Muse Image $0.01/Bild; SAM 3.1 $2.50/1'000 Bilder. Ein kompletter Agent-Durchlauf liegt im Rappen-/Cent-Bereich.

## Datenmodelle (TypeScript)

```typescript
// 1. Request des Nutzers
interface DesignRequest {
  image: File;                 // Raumfoto
  style: string;               // z.B. "skandinavisch", "modern", "boho"
  budgetChf: number;           // Budget in CHF
  keep?: string[];             // zu behaltende Objekte (SAM-Masken/Labels)
  replace?: string[];          // zu ersetzende Objekte
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
  imageUrl: string;            // echtes Produktbild (als Muse-Image-Referenz nutzbar)
  sourceUrl: string;           // echte IKEA-Produktseite
  dimensions?: string;
}

// 4. Budget-Plan (programmatisch, vor der Produktsuche)
interface BudgetPlan {
  totalChf: number;
  allocation: { category: string; maxChf: number }[];  // z.B. sofa 45%, lamp 10% ...
}

// 5. Ergebnis der Produkt-Auswahl
interface ShoppingList {
  items: (Product & { reason: string })[];  // reason: kurze Begründung des Agenten
  totalChf: number;                          // programmatisch berechnet
  budgetChf: number;
  withinBudget: boolean;
}

// 6. Verifikation des Agenten (letzte Tool-Instanz vor dem Output)
interface DesignVerification {
  imageListConsistent: boolean;   // Vision-Check: muse-spark sieht das generierte Bild
                                  // und bestätigt, dass die Listen-Produkte sichtbar sind
  withinBudget: boolean;
  keepRespected: boolean;         // Behalten-Markierungen umgesetzt
  issues: string[];               // offene Probleme → Agent iteriert
}

// 7. DesignSession (Client-State / Persistenz-Kandidat)
interface DesignSession {
  id: string;
  request: DesignRequest;
  analysis: RoomAnalysis;
  budgetPlan: BudgetPlan;
  shoppingList: ShoppingList;
  redesignImageUrl: string;
  verification: DesignVerification;
  agentSteps: { tool: string; summary: string }[];   // für UI-Transparenz
  createdAt: string;
}
```

## API-Schnittstellen

| Route | Methode | Input | Output | Modell-Aufruf |
|---|---|---|---|---|
| `/api/design` | POST | multipart: image + style + budgetChf (+ keep/replace) | SSE-Stream der Agent-Steps → `DesignSession` | muse-spark Agent-Loop (ruft SAM + muse-image als Tools) |
| `/api/segment` | POST | multipart: image | Masken/Labels vorhandener Möbel | SAM 3.1 |
| `/api/session` | POST/GET | — | `DesignSession` speichern/laden | — (optional, Phase 3) |

Alle Routen validieren Inputs (zod) und kapseln API-Keys serverseitig. SSE-Streaming, damit die UI die Agent-Schritte live zeigt — Agent-Transparenz ist Demo-Futter (25%) und Technical-Depth-Beweis.

## Projektmodul-Verantwortlichkeiten (`src/lib/`)

- `meta-client.ts` — Singleton OpenAI-Client, Retry, Timeout
- `agent/design-agent.ts` — Tool-Definitionen + Agent-Loop (max. N Iterationen)
- `agent/tools/analyze-room.ts` — Vision-Analyse (Structured Output)
- `agent/tools/segment.ts` — SAM 3.1-Aufruf, Masken → Behalten/Ersetzen
- `agent/tools/catalog-search.ts` — Katalog-Filter per Kategorie/Budget, ID-Validierung
- `agent/tools/edit-image.ts` — muse-image image-to-image mit Produkt-Referenzbildern
- `agent/tools/verify.ts` — Konsistenz-/Budget-Checks (reiner Code, kein LLM)
- `catalog.ts` — Katalog laden, nach Kategorie/Preis filtern, ID-Lookup
- `budget.ts` — Budget-Split-Heuristik, USD→CHF, Summen

## Abgrenzung (Anti-Project-Regel)

Der Guide verbietet "Simple Image Analyzers" und "Basic RAG Applications". Dieses Projekt positioniert sich deshalb explizit als **Multi-Step-Agent mit programmatischer Geschäftslogik** — nicht als Bildanalyse-Demo:

1. Autonomer Agent-Loop mit Tool-Calls und Selbst-Iteration (Budget, Konsistenz)
2. Vision-Analyse mit erzwungenem JSON-Schema (Structured Output)
3. Constrained Produkt-Auswahl: Modell wählt nur per ID aus einem echten Katalog
4. Programmatische Budget-Einhaltung und CHF-Konversion in Code
5. SAM 3.1 + Muse Image + Muse Spark als abgestimmtes System

## Erweiterungspunkte (nur wenn Zeit)

- Muse Voice Transcribe (Sprachinput für Behalten/Ersetzen)
- Design-Session-Historie (localStorage oder SQLite)
- Weitere Raumtypen (Schlafzimmer, Küche)
