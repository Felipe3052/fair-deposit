# 10-Tage-Plan (26. Okt – 4. Nov 2026)

Abgabe: **4. Nov, 9:00 PM ET** (= 5. Nov, 03:00 MEZ). Demo-Video **genau 3 Minuten** (vorgeschrieben, primäres Bewertungs-Artefakt) — **vor** dem letzten Tag aufnehmen.

**Harte Regeln:** Repo muss bei der **Submission public** sein — während der Bauphase **privat**, Umschalten auf public **spätestens 3. Nov** (vor Abgabe) · alles Gezeigte ist **New work only** (während des Hackathons gebaut) und klar als eigener Beitrag identifizierbar · Banned: u.a. "Simple Image Analyzers" → unsere Multi-Step-Pipeline muss klar im Vordergrund stehen.

Bewertung: Impact 30% · Meta-Tooling 25% · Demo 25% · Technische Tiefe 20%.

## Meilensteine

### Tag 1 (Mo 26. Okt) — Fundament ✅
- [x] Projekt-Struktur, Architektur-Doku, Umsetzungsplan
- [x] ~~$150 Model API Credits beantragen~~ — ✅ **Credits erhalten (26. Okt)**
- [ ] Meta Model API Key in `.env.local` eintragen, erster Test-Call (Vision + Bild-Edit) mit einem Testraumfoto
- [x] IKEA-Datensatz herunterladen, `prepare_catalog.py` laufen lassen — ✅ 30'486 Produkte, 12'296 kategorisiert
- [x] Repo auf GitHub pushen — ✅ privat (https://github.com/Felipe3052/ai-interior-designer), **Umschalten auf public spätestens 3. Nov**

### Tag 2 (Di 27. Okt) — Agent-Kern Backend ✅ (26. Okt abends)
- [x] `meta-client.ts` (OpenAI-SDK → api.meta.ai/v1), erster Test-Call ✅ (Tool-Calling + Modell-IDs verifiziert)
- [x] Tool-Definitionen: `search_catalog` (lokaler Filter), `edit_room_image` (muse-image), `verify`, `finish`
- [x] `design-agent.ts`: Agent-Loop mit Tool Calling, max. 8 Iterationen
- [x] `verify.ts`: Budget-Checks als reiner Code + **Vision-basierter Bild-Listen-Check** (Env-Flag `ENABLE_VISION_VERIFY`)
- [x] API-Route `/api/design` mit zod-Validierung + SSE-Streaming der Agent-Steps ✅ (Build verifiziert)

### Tag 3 (Mi 28. Okt) — UI
- [ ] Upload + Stil/Budget-Auswahl
- [ ] **Live-Anzeige der Agent-Steps** (SSE) — Transparenz ist Demo-Futter
- [ ] Before/After-Ansicht mit Ladezuständen
- [ ] Einkaufsliste: Produktkarten (Bild, Name, Preis, Link), Budgetanzeige

### Tag 4 (Do 29. Okt) — **End-to-End-Meilenstein (ohne SAM)**
- [ ] Kompletter Agent-Durchlauf mit 3 verschiedenen Raumfotos funktioniert
- [ ] Bild ↔ Einkaufsliste konsistent (Agent iteriert, bis verify besteht)
- [ ] Budget wird eingehalten (Summen-Logik verifiziert)
- [ ] Fehlerfälle abgefangen (schlechtes Foto, API-Fehler, leere Produktergebnisse)

### Tag 5 (Fr 30. Okt) — SAM 3.1 + Qualität
- [ ] SAM 3.1-Segmentierung (`/api/segment`), Behalten/Ersetzen-Auswahl in der UI
- [ ] Muse-Image-Edit mit SAM-Masken + Produkt-Referenzbildern
- [ ] Prompt-Tuning: Originaltreue der Raumgeometrie evaluieren (Multi-turn-Refinement nutzen)
- [ ] Falls Zeit: Muse Voice Transcribe für Sprachinput

### Tag 6 (Sa 31. Okt) — Meta-Tooling-Bonus + Demo-Video
- [ ] **Demo-Video aufnehmen: genau 3 Minuten** (Momentum: SAM-Auswahl → Agent-Steps live → konsistentes Before/After + Einkaufsliste; vor Tag 7 fertig!)
- [ ] README + kurzer Essay zur Idee (Impact-Argument: Schweizer Fokus, "Build for Your World")

### Tag 7 (So 1. Nov) — Puffer + Polish
- [ ] UI-Polish, Ladeanimationen, Fehlerzustände
- [ ] Deployment (Vercel oder eigenes Hosting) → öffentlicher Demo-Link
- [ ] **Repo von privat auf public umschalten** (`gh repo edit Felipe3052/ai-interior-designer --visibility public --accept-visibility-change-consequences`); Video-Link, Repo-Link und Teamliste fürs Submission-Formular bereitlegen

### Tag 8–9 (Mo 2. – Di 3. Nov) — Härtung
- [ ] Mehrere Durchläufe, Randfälle, Performance (Ladezeiten)
- [ ] Submission-Formular füllen (Video-Link public, Repo public, alle Beteiligten gelistet)

### Tag 10 (Mi 4. Nov) — Abgabe
- [ ] Frühestmöglich einreichen (Frist 9 PM ET)
- [ ] Nichts mehr am Code ändern nach Einreichung

## Demo-Checkliste (für das Video)

1. Raumfoto hochladen, Stil + Budget wählen
2. Before → After Visualisierung
3. Einkaufsliste mit **echten** Produkten, Preisen, Summe unter Budget
4. Klick auf einen IKEA-Link → echtes Produkt
5. Ein Satz zum Impact: "nicht nur Inspiration — umsetzbar"
