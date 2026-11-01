# Demo-Video Storyboard — genau 3:00 (englisch)

Ziel: Jury (Impact 30 % · Meta-Tooling 25 % · Demo 25 % · Technical Depth 20 %) in 3 Minuten überzeugen.
Aufnahme: Replay `Watch the agent inspect an apartment` (aufgezeichneter echter Lauf, 58 s, im Replay ~3× gerafft), Browser 1440×900, US-Locale, Voice-over live oder nachträglich.
Kennzeichnen: "recorded run of a real agent run" im Voice-over nennen (Replay-Badge ist im UI sichtbar).

| Zeit | Bild | Voice-over (EN) |
|---|---|---|
| 0:00–0:15 | Hero "Your landlord wants $1,800 — what do you really owe?", Maskottchen | "Landlord says: $1,800 from my deposit. Is that fair? Most renters just pay. Fair Deposit is an agent that checks — and proves it." |
| 0:15–0:30 | Landing-Karten Find / Prove / Compute, dann Klick auf Demo | "It's built on Meta's models: Muse Spark as the agent, SAM 3.1 for evidence, running on open weights via Baseten." |
| 0:30–1:10 | Live-Schritte: Fotos, Scan-Effekt, Zoom, SAM-Masken legen sich über Loch / Kritzeleien / Boden, "Skeptical second look" | "Spark inspects every photo, zooms into regions, and SAM draws a pixel mask as proof for each finding. Then a second pass tries to reject false alarms — that's the agent verifying itself." |
| 1:10–1:40 | Move-in Vergleich: Befund anklicken → Vorher/Nachher-Panel, Parkett "already at move-in" | "Now the key move: it compares against my move-in photos. The scratched floor was already there — the tenant owes nothing for it." |
| 1:40–2:15 | Fair-Share-Tabelle: $600 → $144 (3.8 / 5 y, 24 % residual), $800 → $0, $400 "no evidence" | "The model never does math. Rules are data, the calculation is code: paint is 3.8 of 5 years old, so only 24 % of the repaint cost. $1,800 claimed — $144 owed." |
| 2:15–2:35 | Antwortbrief scrollen, "Evidence report (PDF)" | "And the agent finishes the job: a reply letter to the landlord, with evidence and the numbers, ready to send." |
| 2:35–2:52 | Architektur-Folie: Spark (Agent + Verifier) · SAM 3.1 · Spark Open · Code-Rechnung · Rule Packs (US estimate, Swiss cited) | "Tool-calling agent, hybrid box/concept prompts for masks, code checks plus a vision cross-check, and swappable rule packs — US estimate here, a cited Swiss table too." |
| 2:52–3:00 | Hero + Live-URL + Repo | "Fair Deposit. Not legal advice — but finally, evidence. Built during the hackathon." |

## Hinweise
- Demo-Fotos teilweise synthetisch (Muse Image) — im Voice-over oder Einblendung nennen.
- "Built during the hackathon" und eigener Beitrag klar benennen (New work only).
- Nicht nennen: Pivot-Geschichte, Interior Designer.
- Vor Aufnahme: Seite neu laden, Browser-Zoom 100 %, Benachrichtigungen aus, ?speed= weglassen (Standardtempo).
- Länge exakt prüfen: 3:00, nicht darüber.

## X-Kurzclip (30–45 s)
Hero → Replay im Schnelldurchlauf → "$1,800 → $144" mit Satz: "My landlord wanted $1,800. An AI agent built on Meta's Muse Spark + SAM 3.1 inspected my photos and says $144. Evidence included." + @-Mentions Meta / Cerebral Valley + Live-Link.
