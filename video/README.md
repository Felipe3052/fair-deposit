# Demo-Video (Remotion) — Stand und Ablauf

Das Video entsteht aus **2x-Aufnahmen der echten App** (Produktions-Build) plus Remotion-Szenen mit virtueller Kamera (Zooms), Callouts, kurzen Maskottchen-Auftritten und dem Voice-over. Länge zurzeit **2:29**.

## Was im Repo liegt / was nur lokal liegt
- Im Repo: Code (`src/`, `capture.mjs`, `capture-stills.mjs`, `remotion.config.ts`), Zielrechtecke `src/cues.json`.
- **Nur lokal (gitignored, regenerierbar):** `public/agent.mp4`, `public/still-*.png`, `footage/`, `out/`.
- **Nur lokal (Lizenz offen):** Voice-over `public/01-hook.mp3` … `08-outro.mp3` (ElevenLabs, Stimme "Jesse – Elearning Casual Friendly Male"; vor der Abgabe Lizenz prüfen oder selbst einsprechen) und `public/inspector.webp` (Maskottchen, mit Muse Image erzeugt).

## Neu aufnehmen (nur nötig, wenn die App sich ändert)
1. Im Hauptordner: `npm run build` und `npx next start -p 3100` (Produktions-Build, kein Dev-Badge).
2. Agent-Lauf, bildgenau und in doppelter Auflösung (virtuelle Zeit, ca. 6 Minuten):
   `cd video && node capture.mjs` → `footage/agent.mp4`, `footage/agent-cues.json`; danach `cp footage/agent.mp4 public/agent.mp4`
3. Standbilder und Zielrechtecke (ca. 30 s): `node capture-stills.mjs` → `public/still-*.png`, `src/cues.json`

Hinweis: Eine ruhende Seite liefert unter virtueller Zeit keine neuen Bilder; deshalb injiziert `capture.mjs` einen unsichtbaren Dauer-Animator. Nach dem Agent-Lauf beendet sich das Skript absichtlich (die Standbilder kommen aus `capture-stills.mjs`).

## Rendern (ca. 25 Minuten)
```bash
cd video
npx remotion render src/index.ts Demo out/demo.mp4 --concurrency=6
```
Qualitätsoptionen stehen in `remotion.config.ts` (JPEG 100, CRF 14, yuv420p, bt709).

## Prüfen nach dem Render (Skill `remotion-video-check`, https://github.com/Felipe3052/remotion-video-check)
```bash
node <skill>/scripts/lint-remotion.mjs src
node <skill>/scripts/qa-video.mjs out/demo.mp4 --src=src
```
Dazu Strips bei 30 fps an jedem Szenenwechsel und an jedem Kamerastart, Texte bei 100 % ansehen. Vorschau (720p) für die Fernansicht:
`ffmpeg -i out/demo.mp4 -vf scale=1280:-2 -c:v libx264 -crf 29 -c:a aac -b:a 128k out/demo-preview.mp4`

## Szenen (Sekunden) — `src/Demo.tsx`, Konstante `T`
Hook 0–13 · Stack 13–26 · Agent 26–57 · Vergleich 57–76 · Rechnung 76–106 · Brief 106–119 · Architektur 119–137 · Abspann 137–149.
Kameraziele kommen aus `src/cues.json` (Rechtecke im 1440×810-Viewport), Zeiten des Agent-Laufs stehen als Kommentar in `Agent`.
