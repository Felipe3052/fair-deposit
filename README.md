# AI Interior Designer — Meta Global AI Developer Hackathon

AI-gestützter Interior Designer: Nutzer laden ein Foto ihres Zimmers hoch, wählen Stil und Budget (CHF) — Meta-Modelle erstellen ein Redesign-Visual und eine Einkaufsliste mit **realen, kaufbaren Produkten** inkl. Preisen, Bildern und Händlerlinks.

## Stack

| Layer | Technologie |
|---|---|
| Frontend + Backend | Next.js (App Router, TypeScript, Tailwind) — ein Service, API Routes |
| Raum-Analyse (Vision) | `muse-spark-1.3` (Meta Model API) |
| Raum-Redesign (Bild-Bearbeitung) | `muse-image-1.0` (Meta Model API, image-to-image) |
| Produktsuche | Structured Output über einen echten Produktkatalog (IKEA-Datensatz, lokal als JSON) |
| Produktdaten | [jeffreyszhou/ikea-us-products-2025](https://huggingface.co/datasets/jeffreyszhou/ikea-us-products-2025) (~30'000 echte IKEA-Produkte) |
| Optional (Meta-Tooling-Bonus) | SAM 3.1 — bestehende Möbel segmentieren für "before/after"-Overlays |

## Quickstart

```bash
# 1. Dependencies installieren
npm install

# 2. Meta Model API Key setzen (siehe .env.example)
cp .env.example .env.local

# 3. Produktkatalog vorbereiten (einmalig, siehe data/README.md)
python scripts/prepare_catalog.py

# 4. Dev-Server starten
npm run dev
# → http://localhost:3000
```

## Projektstruktur

```
├── src/
│   ├── app/                  # Next.js App Router (Pages + API Routes)
│   │   ├── page.tsx          # Haupt-UI: Upload, Stil/Budget-Auswahl, Ergebnis
│   │   └── api/              # Backend-Endpunkte (siehe docs/ARCHITECTURE.md)
│   ├── components/           # UI-Komponenten (Upload, Produktkarte, Budgetanzeige)
│   └── lib/                  # Kernlogik
│       ├── meta-client.ts    # Meta Model API Client (OpenAI-SDK-kompatibel)
│       ├── room-analysis.ts  # Vision-Analyse des Raumfotos
│       ├── redesign.ts       # muse-image Bild-Bearbeitung
│       ├── catalog.ts        # Produktkatalog-Zugriff + Filter
│       └── budget.ts         # Budget-Berechnung / CHF-Konversion
├── data/
│   ├── raw/                  # Heruntergeladener IKEA-Datensatz (gitignored)
│   └── catalog.json          # Aufbereiteter Katalog (gitignored, generiert)
├── scripts/
│   └── prepare_catalog.py    # Datensatz → Katalog (Filter, Preis-Normalisierung)
└── docs/
    ├── ARCHITECTURE.md       # Architektur, Datenmodelle, Schnittstellen
    ├── PLAN.md               # 10-Tage-Umsetzungsplan + Demo-Checkliste
    ├── DATA-SOURCES.md       # Produktdaten: Quelle, Lizenz, Währung
    └── OPEN-QUESTIONS.md     # Annahmen und offene Fragen
```

## Dokumentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Architektur, Datenmodelle, API-Schnittstellen
- **[docs/PLAN.md](docs/PLAN.md)** — 10-Tage-Plan (26. Okt – 4. Nov), Meilensteine
- **[docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)** — Woher Produktdaten/Preise kommen
- **[docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md)** — Technische Annahmen, offene Fragen

## Wichtige Rahmenbedingung

Es dürfen **keine Produkte, Preise oder Verfügbarkeiten erfunden werden** — alle Produktdaten stammen aus dem IKEA-Datensatz mit echten Produkt-URLs. Preisangaben sind USD (Stand Juli 2025); CHF-Umrechnung siehe docs/DATA-SOURCES.md.
