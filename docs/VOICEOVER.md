# Voice-over — exakt 3:00 (englisch, ca. 150 Wörter/Minute)

Zu jedem Block: Zielzeit, Bild, Text. Wortzahlen sind auf Sprechtempo ~150 wpm gerechnet (inkl. kleiner Pausen für Bildwechsel).
Gesamt ca. 335 Wörter (≈ 2:14 reine Sprechzeit bei 150 wpm); der Rest sind bewusste Pausen, in denen die Demo für sich spricht. Zwei Probeaufnahmen machen und bei Abweichung die mit **[kürzbar]** markierten Sätze streichen.

## 0:00–0:14 · Hook (Hero)
Bild: Landing mit "Your landlord wants $1,800. What do you really owe?"
> My landlord wants eighteen hundred dollars from my deposit. Is that fair? Most renters just pay. Fair Deposit is an AI agent that checks — and proves it.

## 0:14–0:28 · Meta-Stack (Landing-Karten, dann Klick auf Demo)
> It runs on Meta's models: Muse Spark as the agent, SAM 3.1 for visual evidence, and the whole thing on open weights through Baseten. This is a recorded run of a real agent session.

## 0:28–1:10 · Agent live (Schritte, Scan, Masken)
Bild: Foto-Kacheln mit Scan-Effekt, Zoom, Masken legen sich über Loch / Kritzeleien / Boden, "Skeptical second look".
> Spark inspects every photo and zooms into regions it's unsure about. For each damage it finds, SAM draws a pixel-accurate mask — that's the proof. A hole in the wall. Crayon on the back wall. Scratches on the floor. Then the agent argues with itself: a skeptical second look tries to reject false alarms. It even zooms into the overview shot, finds nothing new, and moves on. Three findings confirmed, none rejected. **[kürzbar: "A hole in the wall. Crayon on the back wall. Scratches on the floor."]**

## 1:10–1:40 · Einzugsvergleich
Bild: Befund "scratched wood floor" anklicken → Vorher/Nachher; Label "already at move-in".
> Now the move-in photos. The agent compares before and after. The floor was already scratched when I moved in — so I owe nothing for it. That's the argument landlords hate most, and the agent finds it automatically, with the before photo as proof.

## 1:40–2:15 · Rechnung
Bild: Ergebnis-Header "$1,800 → $144", Tabelle: $600 → $144 (3.8 / 5 y, 24 %), $800 → $0, $400 "no evidence".
> The model never does the math. Rules are data, calculation is code. The paint is nearly four years old with a five-year life, so only twenty-four percent of the repaint can be charged: one hundred forty-four dollars. The floor: zero. The countertop: no evidence. Every number is recomputed in code and checked before the report is marked verified. Eighteen hundred claimed — one hundred forty-four owed.

## 2:15–2:35 · Brief
Bild: Scroll zum Antwortbrief, Klick "Evidence report (PDF)".
> And the agent finishes the job. A reply letter to the landlord, with the evidence and the numbers, plus a PDF evidence report. I can edit anything before I send it.

## 2:35–2:52 · Architektur
Bild: Architektur-Folie (Spark Agent + Verifier · SAM 3.1 · Spark Open · Code-Rechnung · Rule Packs).
> Under the hood: a tool-calling agent, mask prompts chosen per damage type, code checks plus a vision cross-check, and swappable rule packs — a US estimate here, a cited Swiss table too. Twenty-two model calls, under a minute, end to end.

## 2:52–3:00 · Abspann
Bild: Hero + Live-URL + Repo.
> Fair Deposit. Not legal advice — but finally, evidence. Every renter has a move-out day. Built during this hackathon.

---

Hinweis Einblendung (Text, nicht gesprochen): "Demo photos partly synthetic (Muse Image)".
