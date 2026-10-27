# Datenquellen

Seit dem Pivot (27. Okt) braucht das Projekt keinen Produktkatalog mehr. Relevant sind drei Arten von Daten: **Regeln** (Lebensdauern), **Testbilder** und **Nutzerfotos**. Der Guide disqualifiziert Projekte, die "code, data, or assets" ohne Rechte nutzen — deshalb ist jede Quelle hier dokumentiert.

## 1. Rule Packs (`data/rules/*.json`)

Grundprinzip: Lebensdauern und Regeln sind **Daten mit Quellenangabe**, nie Modellwissen. Jede Position im Report zitiert die Regel.

| Pack | Quelle | Status |
|---|---|---|
| `ch` | Paritätische Lebensdauertabelle (gemeinsam herausgegeben von Vermieter- und Mieterverbänden in der Schweiz) | **TODO Tag 3:** offizielle Fassung beschaffen, URL + Abrufdatum eintragen, Werte 1:1 übernehmen. Keine Werte aus dem Gedächtnis |
| `generic` | Keine Rechtsquelle — lineare Abschreibung über typische Nutzungsdauern | Im UI und Report **klar als Schätzung** markiert (`isEstimate: true`) |

Weitere Länder (DE, UK, US-Bundesstaaten) nur mit zitierter Primärquelle — siehe Erweiterungspunkte in ARCHITECTURE.md.

## 2. Testbilder

### Echte Fotos (Spike 27. Okt) — Wikimedia Commons

Nur lokal im Scratchpad verwendet, **nicht committet**. Falls sie in Repo, Demo oder Video auftauchen, ist bei CC BY / CC BY-SA eine Namensnennung Pflicht (Autor, Lizenz, Link).

| Datei (lokal) | Wikimedia-Datei | Lizenz |
|---|---|---|
| `floor-scratched.jpg` | Scratched wood floor B&W (26013698391).jpg | CC BY 2.0 |
| `ceiling-peeling.jpg` | Ceiling sheetrock damaged by water so paint was peeling.jpg | CC0 |
| `ceiling-water.jpg` | Ceiling water damage.jpg | CC BY 3.0 |
| `water-damage.jpg` | Water Damage.JPG | CC BY-SA 3.0 |
| `wall-crack.jpg` | Crack in the wall (44892).jpg | CC BY-SA 4.0 (Aussenmauer, für Wohnungen wenig repräsentativ) |
| `wall-crack2.jpg` | Seattle - 619 Western - crack in wall.jpg | CC BY-SA 3.0 |

### Synthetische Bilder (Muse Image)

- `data/test-room.png`: synthetisches Wohnzimmer (Ausgangsbild).
- `scripts/spike/generate-damage.mjs` erzeugt daraus Varianten mit bekannten Schäden (Ground Truth in `truth.json`). Ab Tag 5 auch Einzug/Auszug-Paare für die Demo-Wohnung.
- Im Demo-Video als **synthetisch** kennzeichnen.
- Muse Image hat einen Content-Filter (z.B. "red wine stain" abgelehnt) → Prompts neutral formulieren.

### Nicht verwenden

- `data/test-vittsjo-reference.png` (IKEA-Produktbild aus der Interior-Phase): Rechte unklar, **nicht committen**, nach dem Pivot löschen.

## 3. Nutzerfotos (Datenschutz)

- Fotos aus Wohnungen sind privat. Verarbeitung nur zur Laufzeit, **keine Speicherung** auf dem Server (kein DB, keine Uploads auf Platte).
- Meta Model API im Standard-Mode (Meta trainiert nicht mit unseren Prompts).
- Demo-Ergebnisse werden nur für die vorbereiteten Demo-Bilder gecacht.

## Entfernt mit dem Pivot

IKEA-US-Datensatz (`jeffreyszhou/ikea-us-products-2025`), `data/catalog.json`, `scripts/prepare_catalog.py`, USD→CHF-Umrechnung. Code-Löschung ist für Tag 3 geplant; bis dahin liegen die Dateien noch im Repo (Katalog und Rohdaten waren immer gitignored).
