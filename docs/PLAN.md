# 10-Tage-Plan (26. Okt – 4. Nov 2026)

Abgabe: **4. Nov, 9:00 PM ET** (= 5. Nov, 03:00 MEZ). Demo-Video **vor** dem letzten Tag aufnehmen.

Bewertung: Impact 30% · Meta-Tooling 25% · Demo 25% · Technische Tiefe 20%.

## Meilensteine

### Tag 1 (Mo 26. Okt) — Fundament ✅
- [x] Projekt-Struktur, Architektur-Doku, Umsetzungsplan
- [ ] Meta Model API Key beschaffen, erster Test-Call (Vision + Bild-Edit) mit einem Testraumfoto
- [ ] IKEA-Datensatz herunterladen, `prepare_catalog.py` laufen lassen, Katalog inspizieren

### Tag 2 (Di 27. Okt) — Kern-Pipeline Backend
- [ ] `meta-client.ts`, `room-analysis.ts` (Vision → RoomAnalysis JSON)
- [ ] `redesign.ts` (muse-image image-to-image)
- [ ] `catalog.ts` + `budget.ts` (Filter, CHF, Summen)
- [ ] API-Routen `/api/analyze`, `/api/redesign`, `/api/products` mit zod-Validierung

### Tag 3 (Mi 28. Okt) — UI
- [ ] Upload + Stil/Budget-Auswahl
- [ ] Before/After-Ansicht mit Ladezuständen
- [ ] Einkaufsliste: Produktkarten (Bild, Name, Preis, Link), Budgetanzeige

### Tag 4 (Do 29. Okt) — **End-to-End-Meilenstein**
- [ ] Kompletter Durchlauf mit 3 verschiedenen Raumfotos funktioniert
- [ ] Budget wird eingehalten (Summen-Logik verifiziert)
- [ ] Fehlerfälle abgefangen (schlechtes Foto, API-Fehler, leere Produktergebnisse)

### Tag 5 (Fr 30. Okt) — Qualität der KI-Ergebnisse
- [ ] Prompt-Tuning: Redesign soll originalgetreu bleiben (Raumgeometrie!)
- [ ] Produkt-Auswahl evaluieren: passt Stil? Passt Budget?
- [ ] Falls Redesign-Originaltreue schwach: Muse Image Multi-turn-Refinement nutzen

### Tag 6 (Sa 31. Okt) — Meta-Tooling-Bonus + Demo-Video
- [ ] Optional SAM 3.1-Overlay (Möbel-Masken, "was wird ersetzt")
- [ ] **Demo-Video aufnehmen** (Happy Path, ~2–3 Min, vor Tag 7 fertig!)
- [ ] README + kurzer Essay zur Idee (Impact-Argument)

### Tag 7 (So 1. Nov) — Puffer + Polish
- [ ] UI-Polish, Ladeanimationen, Fehlerzustände
- [ ] Deployment (Vercel oder eigenes Hosting) → öffentlicher Demo-Link

### Tag 8–9 (Mo 2. – Di 3. Nov) — Härtung
- [ ] Mehrere Durchläufe, Randfälle, Performance (Ladezeiten)
- [ ] Submission-Formular füllen (Offizielle Regeln prüfen — wurden erst am 26.10. erwartet!)

### Tag 10 (Mi 4. Nov) — Abgabe
- [ ] Frühestmöglich einreichen (Frist 9 PM ET)
- [ ] Nichts mehr am Code ändern nach Einreichung

## Demo-Checkliste (für das Video)

1. Raumfoto hochladen, Stil + Budget wählen
2. Before → After Visualisierung
3. Einkaufsliste mit **echten** Produkten, Preisen, Summe unter Budget
4. Klick auf einen IKEA-Link → echtes Produkt
5. Ein Satz zum Impact: "nicht nur Inspiration — umsetzbar"
