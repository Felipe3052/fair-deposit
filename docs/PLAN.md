# Umsetzungsplan (26. Okt – 4. Nov 2026) — Fair Deposit

Abgabe: **4. Nov, 9:00 PM ET** (= 5. Nov, 03:00 MEZ) über die CV-Plattform. Demo-Video **genau 3 Minuten** (primäres Bewertungs-Artefakt, zusammen mit Code und Live-Produkt) — **vor** Tag 7 aufnehmen.

**Harte Regeln:** Repo bei Submission **public** (während der Bauphase privat, Umschalten **spätestens 3. Nov**) · **New work only**, im Video klar als eigener Beitrag erkennbar · Anti-Projects meiden (u.a. "Simple Image Analyzers", medizinische Ratschläge) → Agent-Loop und erledigte Aufgabe (Report + Brief) stehen im Vordergrund.

Bewertung (Stage 2, 0–10): Impact 30% · Meta-Tooling 25% · Demo 25% · Technical Depth & Execution 20%. Top 5 pro Track → Finale am 9. Nov (Jury schaut die Videos live).

**Pivot 27. Okt:** vom AI Interior Designer zum Move-out Inspection Agent (Begründung: [POSITIONING.md](POSITIONING.md), Umbau: [ARCHITECTURE.md](ARCHITECTURE.md#code-umbau-skizze)). Solo-Projekt → Scope bewusst klein halten, keine weiteren Pivots.

## Meilensteine

### Tag 1 (Mo 26. Okt) — Fundament ✅
- [x] Projekt-Struktur, Doku, Plan
- [x] $150 Model API Credits erhalten, API Key eingerichtet
- [x] Repo auf GitHub (privat): https://github.com/Felipe3052/ai-interior-designer
- [x] Agent-Kern (meta-client, Tool-Loop, SSE-Route) — wird im Pivot wiederverwendet

### Tag 2 (Di 27. Okt) — Pivot + Machbarkeits-Spike ✅
- [x] Preise/Bewertung aus dem offiziellen Participant Guide ausgewertet
- [x] Ideenentscheid: Move-out Inspection Agent (global, Schweiz nur als Ursprung)
- [x] Spike: Spark erkennt Schäden ohne Fehlalarm, SAM-Masken mit Hybrid-Strategie (`scripts/spike/`)
- [x] POSITIONING, ARCHITECTURE, PLAN umgeschrieben
- [ ] Interior-Stand als Rückfallpunkt committen
- [ ] **Baseten-Credits beantragen** (nur 2'000 Plätze, für Open-Weight-Bonus), optional Modal
- [ ] Repo umbenennen (z.B. `fair-deposit`) — vor dem Public-Schalten

### Tag 3 (Mi 28. Okt) — Backend: Inspektions-Agent ✅ (27. Okt abends vorgezogen)
- [x] Altlasten löschen (Katalog, Budget, edit-image, prepare_catalog.py, alte UI)
- [x] `types.ts` (zod), `inspect-photo.ts`, Zoom (im Agenten, Kacheln/Region), `segment-finding.ts` (Hybrid + Plausibilitätscheck), `verify-report.ts` (Code-Checks + Vision-Gegenprüfung)
- [x] Rule Packs `ch.json` (Schweizerischer Mieterschutz, Auszug der paritätischen Tabelle, mit Varianten) + `generic.json` (als Schätzung markiert)
- [x] `fair-share.ts` + Unit-Tests (`npm test`, 8 Tests)
- [x] `inspection-agent.ts` + `/api/inspect` (SSE); E2E mit 4 Spike-Bildern + 3 Forderungen: 69 s, verifiziert, kein Fehlalarm im Kontrollbild, 2'900 → 391.50 CHF
- [ ] Offen: Duplikate zwischen überlappenden Zoom-Kacheln (Agent verwirft sie selbst, kostet aber Calls) → Tag 5
- [ ] Workshop "Agents 102: Verifiable Agents" (12:00 ET = 17:00 MEZ) anschauen → Erkenntnisse übernehmen

### Tag 4 (Do 29. Okt) — UI + End-to-End-Meilenstein ✅ (vorgezogen auf 27. Okt)
- [x] Setup (Rule Pack, Daten, Bauteilalter + Material), Multi-Foto-Upload mit Raumnamen, Forderungen erfassen, "Load demo apartment" (`public/demo/`)
- [x] Live-Agent-Steps (AgentSteps wiederverwendet) + Sprechblase mit aktuellem Schritt
- [x] PhotoEvidence: Fotos mit SAM-Masken + Boxen (gestrichelt bis bestätigt), Klick Befund ↔ Liste
- [x] ShareTable: Position, Alter/Lebensdauer, Restwert-%, Forderung vs. Anteil, Regelquelle, "Not legal advice"
- [x] Maskottchen (Inspektor-Plüschfigur, per `scripts/spike/generate-mascot.mjs` mit Muse Image erzeugt) in Header, Hero und Lauf-Ansicht
- [x] **E2E im Browser:** Demo-Wohnung, verifiziert, 2'900 → 391.50 CHF; `npm run build` grün
- [x] **Maskenqualität** (direkt nachgezogen): SAM-Konzept-Prompts nur mit kurzen Nomen ("drawing", "scratches" statt Sparks Satz-Label → vorher 0 Masken), mehrere Begriffe parallel + Instanzen zusammengeführt; dünne Schäden (Kratzer, Kritzeleien, Risse) nie mehr per Box-Prompt (griff Sofa / ganzen Boden). Kritzeleien und Kratzer jetzt einzeln maskiert.

### Tag 5 (Fr 30. Okt) — Verifikation + Agent-Tiefe
- [ ] `verify-report.ts`: Code-Checks + Spark-Gegenprüfung auf Crops, Agent iteriert bei Fehlern
- [ ] `compare-move-in.ts`: Einzug-vs-Auszug ("war schon da")
- [ ] `draft-letter.ts` + Export (Markdown/PDF)
- [ ] Demo-Datensatz: 2–3 Wohnungen als Einzug/Auszug-Paare (Muse Image, `generate-damage.mjs` erweitern) + echte freie Fotos; Fehlalarm-Rate prüfen
- [ ] Fehlerfälle: unscharfes Foto, keine Befunde, API-Fehler, zu viele Bilder

### Tag 6 (Sa 31. Okt) — Demo-Video + README
- [ ] Storyboard (siehe Demo-Checkliste), englisch
- [ ] **Video aufnehmen: genau 3:00**
- [ ] README englisch (Problem, Architektur-Diagramm, Meta-Modelle, Setup, "built during the hackathon")
- [ ] 30–45 s Kurzclip für X vorbereiten

### Tag 7 (So 1. Nov) — Puffer + Bonus
- [ ] UI-Polish, Ladezustände, "Not legal advice"-Hinweis
- [ ] Deployment (Vercel) → öffentlicher Demo-Link; Demo-Ergebnisse cachen
- [ ] Optional Open-Weight-Bonus: Inspektions-Pass auf `muse-spark-open-1026` (Baseten/Modal) per Env-Flag

### Tag 8–9 (Mo 2. – Di 3. Nov) — Härtung + Public
- [ ] Mehrere Durchläufe, Randfälle, Ladezeiten
- [ ] **Repo public schalten** (`gh repo edit … --visibility public --accept-visibility-change-consequences`), Lizenz hinzufügen
- [ ] Submission-Formular vorbereiten (Video-Link public, Repo-Link, X-Post-Link)
- [ ] 3. Nov: letzter Tag für Support-Fragen im Discord

### Tag 10 (Mi 4. Nov) — Abgabe
- [ ] Frühestmöglich einreichen (Frist 9 PM ET)
- [ ] Demo-Clip auf X posten (@-Mentions Meta / Cerebral Valley), Link in der Submission
- [ ] Danach keine Code-Änderungen mehr

## Scope-Regeln (solo)

- **Muss:** Inspektion + Masken + Fair-Share-Rechnung + Report + Live-Agent-Steps
- **Soll:** Selbstprüfung, Einzug-vs-Auszug, Antwortbrief
- **Kann:** Open-Weight-Pass, Video-Rundgang, Voice, weitere Rule Packs
- Bis Ende Tag 5 kein neues "Kann"-Feature, solange ein "Muss" wackelt.

## Demo-Checkliste (3-Min-Video, englisch)

1. **Hook (0:00–0:15):** *"Landlord claims $1,800 from my deposit. Is that fair?"* — eigene Erfahrung in einem Satz
2. Setup + Fotos hochladen, Forderung des Vermieters eingeben
3. **Agent live:** Befunde erscheinen, Agent zoomt, SAM-Masken legen sich über die Schäden, ein Befund wird bei der Selbstprüfung verworfen
4. **Fair-Share-Tabelle:** wear vs. damage, Restwert-Rechnung mit Regelzitat, *"$240, not $1,800"*
5. Einzug-vs-Auszug-Moment ("already there at move-in")
6. Antwortbrief + Export
7. Architektur-Folie: Spark (Agent + Verifier) + SAM 3.1 (+ Spark Open), "rules are data, math is code"
8. Hinweis: Demo-Fotos teilweise synthetisch (Muse Image), alles während des Hackathons gebaut
