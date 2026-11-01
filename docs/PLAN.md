# Umsetzungsplan (26. Okt – 4. Nov 2026) — Fair Deposit

Abgabe: **4. Nov, 9:00 PM ET** (= 5. Nov, 03:00 MEZ) über die CV-Plattform. Demo-Video **genau 3 Minuten** (primäres Bewertungs-Artefakt, zusammen mit Code und Live-Produkt) — **vor** Tag 7 aufnehmen.

**Harte Regeln:** Repo bei Submission **public** (während der Bauphase privat, Umschalten **spätestens 3. Nov**) · **New work only**, im Video klar als eigener Beitrag erkennbar · Anti-Projects meiden (u.a. "Simple Image Analyzers", medizinische Ratschläge) → Agent-Loop und erledigte Aufgabe (Report + Brief) stehen im Vordergrund.

Bewertung (Stage 2, 0–10): Impact 30% · Meta-Tooling 25% · Demo 25% · Technical Depth & Execution 20%. Top 5 pro Track → Finale am 9. Nov (Jury schaut die Videos live).

**Pivot 27. Okt:** vom AI Interior Designer zum Move-out Inspection Agent (Begründung: [POSITIONING.md](POSITIONING.md), Umbau: [ARCHITECTURE.md](ARCHITECTURE.md#code-umbau-skizze)). Solo-Projekt → Scope bewusst klein halten, keine weiteren Pivots.

## Meilensteine

### Tag 1 (Mo 26. Okt) — Fundament ✅
- [x] Projekt-Struktur, Doku, Plan
- [x] $150 Model API Credits erhalten, API Key eingerichtet
- [x] Repo auf GitHub (privat): https://github.com/Felipe3052/fair-deposit
- [x] Agent-Kern (meta-client, Tool-Loop, SSE-Route) — wird im Pivot wiederverwendet

### Tag 2 (Di 27. Okt) — Pivot + Machbarkeits-Spike ✅
- [x] Preise/Bewertung aus dem offiziellen Participant Guide ausgewertet
- [x] Ideenentscheid: Move-out Inspection Agent (global, Schweiz nur als Ursprung)
- [x] Spike: Spark erkennt Schäden ohne Fehlalarm, SAM-Masken mit Hybrid-Strategie (`scripts/spike/`)
- [x] POSITIONING, ARCHITECTURE, PLAN umgeschrieben
- [ ] Interior-Stand als Rückfallpunkt committen
- [x] **Baseten-Credits beantragt und erhalten** (28. Okt)
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

### Tag 5 (Fr 30. Okt) — Verifikation + Agent-Tiefe ✅ (vorgezogen auf 28. Okt)
- [x] `verify-report.ts`: Code-Checks + Gegenprüfung auf Crops, Agent iteriert bei Fehlern (seit Tag 3); neu: Einzugsvergleich wird verlangt, wo Einzugsfotos existieren; Prüf-Prompt spekuliert nicht mehr über "Aufkleber"
- [x] Duplikate über Zoom-Kacheln: Teilstücke gleicher Kategorie, die sich berühren, werden zu einer Box vereinigt
- [x] `compare-move-in.ts`: Einzug vs. Auszug (Raum-Zuordnung über den Namen vor " — "), Status `pre_existing` → Mieter zahlt 0; vorbestehende Befunde dürfen nicht verworfen werden (stärkstes Argument)
- [x] UI: Einzug/Auszug-Schalter pro Foto, **Vorher/Nachher-Panel** beim Klick auf einen verglichenen Befund
- [x] `lib/letter.ts` + LetterPanel: Antwortbrief deterministisch aus dem Report (kopieren, .md, Beweisbericht als PDF über Druckdialog)
- [x] **Aufgezeichnete Demo-Fahrt** (`scripts/record-demo-run.mjs` → `public/demo/recorded-run.json`, "▶ Watch demo run", als Replay gekennzeichnet, 3× gerafft) — Video/Pitch ohne API-Risiko
- [x] Demo-Story: Einzugsfoto mit schon zerkratztem Parkett → 2'900 → 247.50 CHF (Loch + Kritzeleien neu, Parkett "already at move-in", Küche ohne Beleg), verifiziert, ganz auf Open Weights
- [ ] Offen: echte Fotos (Nutzer) als zweites Demo-Set; Fehlerfälle (unscharfes Foto, keine Befunde, API-Fehler)

### Tag 6 (Sa 31. Okt) — Demo-Video + README
- [x] Storyboard ([STORYBOARD.md](STORYBOARD.md)) und Voice-over ([VOICEOVER.md](VOICEOVER.md)), englisch
- [ ] **Video v2 (Render am 2. Nov):** Neue Fassung mit 2x-Aufnahme, virtueller Kamera (Zooms), Maskottchen nur an Übergängen; Code gepusht, Anleitung in `video/README.md`. Offen: Rendern (ca. 25 min), QA mit `remotion-video-check`, Hörprobe, Länge/Lizenz klären.
- [x] **Video v1 (1. Nov):** Remotion-Schnitt in `video/` (echte Browser-Aufnahme des Replays + animiertes Maskottchen, Callouts, Architektur-Folie), Voice-over mit ElevenLabs (Stimme Jesse, 8 Blöcke), **2:29** lang. Offen: Länge laut Participant Guide ("genau 3:00" oder "bis zu"), Lizenz der Stimme (Gratis-Konto wurde bei ElevenLabs gesperrt), X-Kurzclip
- [x] README englisch (Problem, Meta-Modelle, Setup, "built during the hackathon"); Architektur-Diagramm als Folie im Video
- [ ] 30–45 s Kurzclip für X aufnehmen (Text: [X-POST.md](X-POST.md))

### Tag 7 (So 1. Nov) — Puffer + Bonus
- [x] UI-Polish (vorgezogen, 31. Okt): UI-Review-Fixes (Commit ba89861) — Befund-Klick springt zur Foto-Evidence statt zum Brief, "1 finding(s)" → korrekte Pluralisierung, Antwortbrief als gerenderte Vorschau (rohes Markdown nur noch hinter "Edit letter"), Hilfetext am disabled "Start inspection", Label "When was it last renewed?" nur mit Komponenten sichtbar. Build grün, 10/10 Tests, live auf Vercel verifiziert.
- [x] **US-Ausrichtung** (1. Nov): Default USD + Rule Pack `generic` ("United States — typical useful lives (estimate)", Schweiz bleibt als zitiertes Pack), Demo-Wohnung $600 / $800 / $400 = $1,800, Mietbeginn 2023-09, Demo-Fahrt neu aufgezeichnet (**$1,800 → $144**, verifiziert, 58 s, 22 Calls, Open Weights); Brief im US-Wording (security deposit, itemized statement, US-Datum)
- [x] UI-Polish Desktop/Mobile (1. Nov): Hero als Frage ("What do you really owe?"), Ergebnis zeigt Befunde zuerst und Agent-Schritte eingeklappt, Mobile-Karten statt scrollender Tabelle, "$0.00" statt "open" bei fehlendem Beleg, freundliche Verbindungsfehler
- [x] MIT-Lizenz (`LICENSE`)
- [x] Deployment (Vercel, 28. Okt): https://fair-deposit-73nv.vercel.app — Live-Lauf getestet (51 s, verifiziert, 2'900 → 247.50), Demo-Ergebnis als aufgezeichnete Fahrt, Rate-Limit aktiv; Repo in `fair-deposit` umbenannt
- [x] Open-Weight-Bonus (vorgezogen auf 28. Okt): `OPEN_WEIGHTS=1` (Vision-Pässe) bzw. `=all` (ganzer Agent) auf `meta-models/muse-spark-open-1026` über Baseten. Demo identisch zu hosted: 3 bestätigte Befunde, 2'900 → 391.50, verifiziert, 75–84 s statt 69 s. Default für Demo und Video: `OPEN_WEIGHTS=all`

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
