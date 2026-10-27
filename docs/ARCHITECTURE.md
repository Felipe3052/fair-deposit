# Architektur — Fair Deposit (Move-out Inspection Agent)

Produktidee und Wettbewerb: siehe [POSITIONING.md](POSITIONING.md). Pivot vom AI Interior Designer am 27. Okt; Stack und Agent-Gerüst bleiben, die Domäne wechselt.

## Stack-Entscheidung (unverändert)

**Ein Next.js-Full-Stack-Projekt** (App Router + API Routes, TypeScript):
- Ein Service = ein Deployment (Vercel-ready), keine CORS-/Proxy-Themen.
- Meta Model API ist **OpenAI-SDK-kompatibel** (`base_url: https://api.meta.ai/v1`), SAM-Parsing über `@meta-sam/parser`.
- Kein Python-Backend nötig (der IKEA-Katalog-Schritt fällt weg).

## User Flow

1. **Setup:** Land/Rule Pack wählen (Schweiz = vollständig zitiert, "Generic" = Schätzung), Mietbeginn, optional Alter einzelner Bauteile (z.B. "Boden 2015 verlegt", "zuletzt gestrichen 2021").
2. **Fotos:** pro Raum Übersicht + beliebige Nahaufnahmen. Optional: Einzugsfotos/-protokoll zum Vergleich.
3. **Optional: Forderung des Vermieters** als Positionen erfassen ("Parkett schleifen: 1'200", "Wand streichen: 600").
4. **Agent läuft live** (SSE): Inspektion → Zoom → Masken → Regeln → Fair-Share-Rechnung → Selbstprüfung.
5. **Ergebnis:** Befundliste mit Masken-Overlays, *wear vs. damage*, Anteil Mieter/Vermieter pro Position mit Regelzitat, Summe vs. Forderung, **Antwortentwurf an den Vermieter**, Export (Markdown/PDF).

## Kern-Architektur: Verifiable Agent-Loop

```
┌──────────┐  Fotos, Rule Pack,     ┌────────────────────────────────────────────┐
│ Browser  │  Mietbeginn, Bauteil-  │ POST /api/inspect  (SSE-Streaming)         │
│          │  alter, Forderungen    │                                            │
└──────────┘ ─────────────────────▶ │ muse-spark AGENT-LOOP (max. N Iterationen):│
                                    │                                            │
                                    │  inspect_photo    Spark Vision → Befunde   │
                                    │  zoom_region      Kachel/Crop → re-inspect │
                                    │  segment_finding  SAM 3.1 (Box | Konzept)  │
                                    │  compare_move_in  Spark, 2 Bilder (optional)│
                                    │  lookup_rule      Rule Pack (Code)         │
                                    │  compute_share    Restwert-Rechnung (Code) │
                                    │  verify_report    Code-Checks + Vision-    │
                                    │                   Gegenprüfung der Befunde │
                                    │  draft_letter     Spark Text               │
                                    │  finish                                    │
                                    └──────────────────┬─────────────────────────┘
                                                       │ InspectionReport (Stream)
                                    ┌──────────────────▼─────────────────────────┐
                                    │ UI: Fotos + Masken, Befundliste, Fair-Share│
                                    │ Tabelle, Summe vs. Forderung, Brief-Entwurf│
                                    └────────────────────────────────────────────┘
```

### Prinzipien

1. **Das Modell sieht und urteilt, Code rechnet.** Spark liefert Befunde (Typ, Fläche, Schwere, Box, wear/damage). Lebensdauern kommen aus dem Rule Pack, Beträge aus der Forderung des Vermieters bzw. Nutzereingabe, Summen und Anteile aus `compute_share`. Kein Betrag stammt aus dem Modell.
2. **Jeder Befund hat einen Beleg.** Ein Befund ohne plausible SAM-Maske (oder bestätigte Box) wird nicht in den Report übernommen bzw. als "unbestätigt" markiert.
3. **Selbstprüfung statt Vertrauen.** `verify_report` prüft: Maske liegt in/nahe Sparks Box, jede Position hat Regel + Quelle, Summe = Code-Ergebnis, und ein zweiter Spark-Pass bestätigt jeden *damage*-Befund auf dem Crop ("Ist das wirklich ein Schaden, oder Reflexion/Schatten/Möbel?"). Fehler → Agent iteriert (anderer SAM-Prompt, Zoom, Befund verwerfen).
4. **Strategie-Wahl ist Agenten-Arbeit.** Aus dem Spike: Box-Prompt für flächige Schäden (Fleck, Wasserschaden, Riss, abblätternde Farbe), Konzept-Prompt (Sparks Label) für dünne/verstreute (Kratzer, Kritzeleien). Fallback auf die jeweils andere Strategie.
5. **Not legal advice.** UI und Report formulieren als Einschätzung mit Quellen; generisches Paket ist klar als Schätzung markiert.

## Meta Model API Integration

| Zweck | Modell | Modus | Anmerkung |
|---|---|---|---|
| Agent-Loop, Inspektion, Gegenprüfung, Brief | `muse-spark-1.3` | Chat Completions + **Tool Calling**, Vision via `image_url` (data URL) | Reasoning-Modell: `max_tokens` ≥ 3000; `tool_choice` nur `"auto"` |
| Beweis-Masken | `sam-3.1` | Responses API, Stream; Text-Prompt **oder** Box-Prompt via `buildObjectPrompt` | Ein Konzept pro Call; Maske = Raster innerhalb `bounds` |
| Optional: Open-Weight-Bonus | `meta-models/muse-spark-open-1026` | Baseten/Modal (OpenAI-kompatibel) | Inspektions-Pass austauschbar über Env-Flag |
| Optional: Rundgang-Video | `sam-3.1` | `parseVideoStream` (Parser unterstützt Video) | Stretch Goal, API-Support noch ungeprüft |
| Entwicklung/Demo-Daten | `muse-image-1.0` | `/v1/images/edits` | Erzeugt Einzug/Auszug-Bildpaare für Tests und Demo — nicht Teil des Produkts; im Video als synthetisch kennzeichnen |

Kosten: Spark $1.25/M input, $4.25/M output; SAM 3.1 $2.50/1'000 Bilder; Muse Image $0.01/Bild. Eine Inspektion mit ~10 Fotos liegt im Cent-Bereich.

### Erkenntnisse aus den Test-Calls

1. Modell-IDs via `/v1/models`: `muse-spark-1.3`, `muse-image-1.0`, `sam-3.1`, `muse-wonder-1.0`, `muse-voice-transcribe-1.0`.
2. Spark braucht grosszügige `max_tokens` (Reasoning frisst sonst den Output).
3. `tool_choice` nur `"auto"` — Reihenfolge über den System-Prompt steuern.
4. Spike 27. Okt (Details in POSITIONING.md): Spark erkennt und klassifiziert Schäden zuverlässig ohne Fehlalarm im Kontrollbild; SAM-Masken präzise bei passender Prompt-Strategie; kleine Schäden auf Raumübersichten brauchen Zoom/Nahaufnahmen.
5. Muse Image hat einen Content-Filter (z.B. "red wine stain" abgelehnt).

## Datenmodelle (TypeScript)

```typescript
// 1. Request
interface InspectionRequest {
  rulePack: "ch" | "generic";
  tenancyStart: string;                  // ISO-Datum
  moveOutDate: string;
  components?: { component: ComponentType; installedYear: number }[]; // optional bekanntes Alter
  photos: { id: string; room: string; kind: "move_out" | "move_in"; imageBase64: string }[];
  landlordClaims?: { id: string; description: string; amount: number; currency: string }[];
}

type ComponentType =
  | "wall_paint" | "wallpaper" | "parquet" | "laminate" | "carpet" | "tiles"
  | "kitchen_counter" | "door" | "window" | "bathroom_fixture" | "other";

type Box = { left: number; top: number; right: number; bottom: number }; // Pixel, right/bottom halboffen

// 2. Befund (Spark Vision, Schema per zod validiert)
interface Finding {
  id: string;
  photoId: string;
  label: string;                         // "hole in wall" (auch SAM-Konzept-Prompt)
  category: "hole" | "scratch" | "stain" | "crack" | "marks" | "water_damage" | "mold" | "peeling_paint" | "other";
  component: ComponentType;
  classification: "normal_wear" | "damage";
  severity: "minor" | "moderate" | "severe";
  description: string;
  box: Box;
  confidence: number;
  evidence?: { maskPath: string; bounds: Box; strategy: "box" | "concept"; samConfidence: number | null };
  preExisting?: { value: boolean; reason: string };   // aus compare_move_in
  status: "confirmed" | "unconfirmed" | "rejected";   // nach verify_report
}

// 3. Rule Pack (data/rules/*.json)
interface RulePack {
  id: "ch" | "generic";
  name: string;
  source: { title: string; url: string; retrieved: string } | null; // generic: null → Schätzung
  isEstimate: boolean;
  lifespans: { component: ComponentType; years: number; note?: string }[];
  normalWearExamples: string[];          // für den Inspektions-Prompt
}

// 4. Fair-Share-Position (compute_share, reiner Code)
interface ShareLine {
  claimId: string | null;                // null = Befund ohne Forderung
  findingIds: string[];
  component: ComponentType;
  claimedAmount: number | null;
  ageYears: number;
  lifespanYears: number;
  residualShare: number;                 // max(0, 1 - age/lifespan)
  tenantPays: number;                    // damage: claimed × residualShare; normal_wear: 0
  rule: string;                          // menschenlesbare Begründung inkl. Quelle
}

// 5. Report
interface InspectionReport {
  findings: Finding[];
  lines: ShareLine[];
  totals: { claimed: number; tenantPays: number; currency: string };
  verification: { passed: boolean; issues: string[] };
  letterDraft: string;
  agentSteps: { tool: string; summary: string }[];
  disclaimer: string;
}
```

## API-Schnittstellen

| Route | Methode | Input | Output | Modelle |
|---|---|---|---|---|
| `/api/inspect` | POST | JSON (`InspectionRequest`, zod) | SSE: Agent-Steps, Befunde inkrementell, finaler `InspectionReport` | Spark-Agent (ruft SAM als Tool) |
| `/api/segment` | POST | Bild + Box **oder** Konzept-Text | Masken + Boxen | SAM 3.1 (für manuelles Nachmarkieren in der UI, optional) |

Alle Routen validieren Inputs (zod), kapseln API-Keys serverseitig, begrenzen Bildgrösse/-anzahl.

## Code-Umbau (Skizze)

Ausgangsstand: Interior-Designer-Code (Agent-Loop, SSE, SAM, UI). Etwa die Hälfte ist direkt wiederverwendbar.

| Datei | Aktion | Neu / Anmerkung |
|---|---|---|
| `src/lib/meta-client.ts` | **behalten** | + optionaler zweiter Client für Muse Spark Open (Env) |
| `src/lib/agent/design-agent.ts` | **umbauen** → `inspection-agent.ts` | Loop, Iterations-Cap, SSE-Events und Tool-Dispatch bleiben; neue Tool-Definitionen + System-Prompt |
| `src/lib/agent/types.ts` | **neu schreiben** | Schemas aus "Datenmodelle" (zod) |
| `src/lib/agent/tools/analyze-room.ts` | **umbauen** → `inspect-photo.ts` | Prompt aus `scripts/spike/detect-damage.mjs`, Box 0–1000 → Pixel |
| `src/lib/agent/tools/segment-furniture.ts` | **umbauen** → `segment-finding.ts` | Box-/Konzept-Strategie, Plausibilitätscheck Maske ↔ Box |
| `src/lib/agent/tools/verify.ts` | **neu schreiben** → `verify-report.ts` | Code-Checks + Spark-Gegenprüfung auf Crops |
| — | **neu** `zoom-region.ts` | sharp-Crop (Kacheln oder Box + Rand), re-inspect |
| — | **neu** `compare-move-in.ts` | Spark mit Einzugs- + Auszugsbild (Tag 5) |
| — | **neu** `rules.ts` + `data/rules/ch.json`, `generic.json` | Rule Pack laden, Lookup pro Bauteil |
| — | **neu** `fair-share.ts` + Tests | Restwert-Rechnung, Summen (reiner Code, Unit-Tests) |
| — | **neu** `draft-letter.ts` | Spark-Text aus Report (nur Fakten aus dem Report) |
| `src/app/api/design/route.ts` | **umbauen** → `api/inspect/route.ts` | SSE-Gerüst und Validierung bleiben |
| `src/app/api/segment/route.ts` | **anpassen** | Box/Konzept-Input statt fixer Möbelliste |
| `src/components/AgentSteps.tsx` | **behalten** | Tool-Namen/Icons anpassen |
| `src/components/FurnitureSelector.tsx` | **umbauen** → `FindingsViewer.tsx` | Masken-Overlay-Rendering wiederverwenden; Klick auf Befund ↔ Liste |
| `src/components/DesignApp.tsx` | **umbauen** → `InspectionApp.tsx` | Multi-Foto-Upload, Setup, Forderungen, Ergebnisansicht |
| `src/components/ShoppingList.tsx` | **ersetzen** → `ShareTable.tsx`, `LetterDraft.tsx` | |
| `src/lib/catalog.ts`, `budget.ts`, `currency.ts`, `agent/tools/edit-image.ts` | **löschen** | IKEA/Budget-Logik entfällt |
| `scripts/prepare_catalog.py`, `data/catalog.json`, `data/raw/` | **löschen** | `docs/DATA-SOURCES.md` neu schreiben (Rule-Pack-Quellen, Testbild-Lizenzen) |
| `scripts/spike/*` | **behalten** | `generate-damage.mjs` wird zum Generator für Demo-Bildpaare |

Reihenfolge: Backend-Tools mit Spike-Code als Vorlage → Agent-Loop → `/api/inspect` per curl testen → UI.

## Abgrenzung (Anti-Project-Regel)

Der Guide verbietet u.a. "Simple Image Analyzers" und medizinische Ratschläge. Abgrenzung:
1. Autonomer Agent mit Tool-Calls, Zoom, Strategie-Wahl und Selbstprüfung
2. Ergebnis ist eine **erledigte Aufgabe** (Report mit Rechnung + Antwortbrief), keine Bildbeschreibung
3. Regelwerk und Rechnung in Code, Modell nur für Wahrnehmung und Text
4. Spark + SAM 3.1 als abgestimmtes System (+ optional Spark Open)
5. Kein Gesundheits-, Politik- oder Personenbewertungsbezug

## Erweiterungspunkte (nur wenn Zeit)

- Rundgang-Video statt Einzelfotos (SAM 3.1 Video-Tracking)
- Muse Voice Transcribe: Notizen beim Rundgang einsprechen
- Weitere Rule Packs (z.B. DE, UK) mit zitierten Quellen
