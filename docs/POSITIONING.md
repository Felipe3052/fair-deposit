# Positionierung — Move-out Inspection Agent

Stand: 27. Okt 2026. Pivot von "AI Interior Designer" (zu überlaufen, Impact schwach) zu einem Agenten, der **Mieter bei der Wohnungsabgabe** schützt. Entscheidungsgrundlage: offizieller Participant Guide (Bewertung + Preise) und technischer Spike vom 27. Okt (siehe unten).

Arbeitstitel: **Fair Deposit** (Name vor Veröffentlichung auf Kollisionen prüfen).

## Problem (global)

Fast jeder Mieter zahlt eine Kaution (Security Deposit, Bond, Mietkaution). Bei der Abgabe entscheidet der Vermieter, was davon zurückkommt — mit Wissens- und Machtvorsprung. Der Kernstreit ist überall derselbe: **Ist das normale Abnutzung oder ein Schaden, für den der Mieter zahlt?** Und selbst bei echtem Schaden darf in vielen Rechtsordnungen nur der **Restwert** des Bauteils verrechnet werden (ein 10 Jahre alter Teppich ist nicht mehr den Neupreis wert). Die meisten Mieter kennen diese Regeln nicht.

Schweizer Bezug nur als Ursprung ("Build for Your World"): *"I built this after my own move-out inspection in Switzerland."* Pitch, UI, Video und README sind **englisch und global**.

## Wettbewerb — ehrlich

Es gibt bereits AI-Inspektions-Tools, z.B. Paraspot, RentSolve, SnapInspect (überwiegend **vermieterseitig**: Property Manager, Abzüge begründen) sowie einzelne Mieter-Apps (Proofr, Witnessed, MoveOutReport: Foto-Dokumentation, Schadens-Scan). Die Leistungsversprechen dort sind Marketing, nicht unabhängig belegt.

**Konsequenz:** Nie "first AI move-out tool" behaupten. Unser Unterschied liegt in drei Wedges:

## Wedge 1 — Tenant-side + "Fair Share"-Rechnung (Impact 30%)

Nicht nur "Schaden gefunden", sondern **"Du schuldest X, nicht Y — und hier ist warum."**
- Jeder Befund wird als *normal wear* oder *damage* eingestuft.
- Für Schäden rechnet **Code** (nicht das Modell) den fairen Anteil: Forderung des Vermieters × Restwert-Anteil nach Lebensdauer des Bauteils, mit Quellenangabe der Regel.
- Ergebnis: ein Abnahme-Report mit Beweisbildern + ein **Antwortentwurf an den Vermieter**. Der Agent erledigt eine Aufgabe, er analysiert nicht nur.

Demo-Satz: *"Landlord claims $1,800. The agent shows $240 — with evidence for every line."*

## Wedge 2 — Verifiable Agent auf Metas Stack (Meta-Tooling 25% + Technical Depth 20%)

Meta setzt selbst auf das Thema (Workshop "Agents 102: Best Practices for Verifiable Agents", 28. Okt). Unser Agent ist von Grund auf überprüfbar:
- **Muse Spark** findet und klassifiziert Befunde (Vision, JSON), **zoomt selbst** in verdächtige Bildbereiche und prüft eigene Befunde in einem zweiten Pass gegen.
- **SAM 3.1** liefert für jeden Befund eine pixelgenaue Maske als Beleg. Der Agent wählt die Prompt-Strategie je nach Schadenstyp (Box-Prompt für flächige Schäden, Konzept-Prompt für dünne/verstreute) — im Spike nachgewiesen.
- **Regeln und Zahlen sind Daten und Code**: Lebensdauern aus einer zitierten Tabelle, Summen programmatisch. Das Modell erfindet keine Beträge.
- Optional: **Einzug-vs-Auszug-Vergleich** (war der Kratzer schon im Einzugsprotokoll?) und **Muse Spark Open** für den Open-Weight-Bonus.

## Wedge 3 — Länderregeln als austauschbare Pakete (global, Technical Depth)

Rule Packs als JSON: ein vollständig zitiertes Paket (Schweiz, paritätische Lebensdauertabelle) + ein generisches Paket (lineare Abschreibung über Nutzungsdauer, klar als Schätzung markiert). Botschaft: "Works for any jurisdiction — rules are data."

## Pitch (englisch)

> *"Every renter dreads move-out day. Fair Deposit is an AI agent built on Meta's models: it inspects your photos, separates normal wear from real damage, proves every finding with a SAM 3.1 mask, and calculates what you actually owe under your local depreciation rules — then drafts your reply to the landlord."*

## Preise — realistische Ziellinie

| Preis | Betrag | Weg |
|---|---|---|
| Indie Top 5 | $25K–$150K | Alle drei Wedges, starkes 3-Min-Video, robuste Live-Demo |
| Best Agentic Use-Case | $5K | Sichtbare Autonomie: Zoom, Selbstprüfung, Strategie-Wahl, Brief-Entwurf |
| Most Viral (X) | $20K | Lotterielos: 30–45 s Clip mit Hook, @-Mentions Meta/Cerebral Valley, früh posten. Keine gekaufte Reichweite |
| Community Vote | $10K | Discord + persönliches Netzwerk |
| Best Build on Open Weights | $10K | Inspektions-Pass auf Muse Spark Open via Baseten/Modal (Credits früh beantragen) |
| ~~Best Creative Build~~ | $5K | Bewusst aufgegeben (Muse Image spielt im Produkt keine Rolle) |

## Rubric-Audit

| Kriterium | Status | Massnahme |
|---|---|---|
| Stage 1: Theme-Fit | ✅ | "Build for Your World", eigene Erfahrung im Video nennen |
| Stage 1: Meta-Modelle | ✅ | Spark + SAM 3.1 (+ Spark Open); Modell-IDs in der UI sichtbar |
| Anti-Projects | ⚠️ "Simple Image Analyzer" | Agent-Loop sichtbar machen; Output ist eine erledigte Aufgabe (Report + Brief), keine Bildbeschreibung. Kein Medizin-/Politik-Bezug |
| Impact | ✅ | Echtes Geld, Machtgefälle, globales Problem. "Not legal advice" sauber kommunizieren |
| Meta-Tooling | ✅ | Spark als Agent + Verifikator, SAM als Beweis-Generator, Strategie-Wahl |
| Technical Depth | ✅ | Rule Packs, Code-Rechnung mit Tests, zod, SSE, Fehlerzustände |
| Demo | ⚠️ | Demo-Wohnung vorbereiten (Einzug/Auszug-Paare), Ergebnisse cachen, Video vor Tag 7 |

## Spike-Ergebnis (27. Okt) — technische Machbarkeit belegt

Skripte: `scripts/spike/` (generate-damage, detect-damage). 13 Bilder: 5 mit Muse Image erzeugte Schäden + 1 sauberes Kontrollbild, 6 echte Fotos (Wikimedia Commons, freie Lizenzen) + Kachel-Tests.

- **Erkennung (Spark):** Loch, Kratzer, Kaffeefleck, Kritzeleien erkannt und als *damage* eingestuft (Konfidenz 0.92–0.97); **kein Fehlalarm** im Kontrollbild; alle 6 echten Fotos erkannt. 3–10 s pro Bild.
- **Masken (SAM 3.1):** Box-Prompt exakt bei flächigen Schäden (Fleck, Wasserschaden, Riss, abblätternde Farbe), versagt bei dünnen Schäden (griff einmal das Sofa). Konzept-Prompt mit Sparks Label maskiert Kratzer/Kritzeleien exakt, versagt aber bei Nahaufnahmen (ganzes Bild) und lieferte beim Loch keine Maske → **Hybrid-Strategie + Plausibilitätscheck** (Maske muss in/nahe Sparks Box liegen).
- **Offen:** Kleine Schäden (Dübellöcher) auf Raumübersichten — Test nicht aussagekräftig. Gegenmittel: Agent zoomt in Bildkacheln und fordert Nahaufnahmen an.
- Muse Image filtert manche Prompts (z.B. "red wine stain").
