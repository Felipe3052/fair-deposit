# Demo-Video (Remotion)

Das 3-Minuten-Video wird aus einer echten Browser-Aufnahme der App plus Remotion-Szenen (Maskottchen-Animation, Callouts, Architektur-Folie) gebaut.

1. App starten: `npm run dev` im Hauptordner (http://localhost:3000)
2. Aufnehmen: `cd video && npm install && node record.mjs` → `footage/replay.webm`, `footage/cues.json`
3. Umwandeln: `npx remotion ffmpeg -y -i footage/replay.webm -c:v libx264 -pix_fmt yuv420p -crf 18 -r 30 -an public/replay.mp4`
4. Ansehen/Feinschliff: `npm run studio`
5. Rendern: `npx remotion render src/index.ts Demo out/demo.mp4 --crf=20`
   Mit Voice-over: Datei als `public/voiceover.mp3` ablegen und
   `npx remotion render src/index.ts Demo out/demo.mp4 --crf=20 --props='{"voice":"voiceover.mp3"}'`

Szenen und Zeiten: `src/Demo.tsx` (`T`), Text: `docs/VOICEOVER.md`. Die Clip-Ausschnitte (`from`/`to`) beziehen sich auf die Videozeit von `replay.mp4`.
Nur Aufnahme der eigenen App; keine fremden Assets außer dem Maskottchen (mit Muse Image erzeugt).
