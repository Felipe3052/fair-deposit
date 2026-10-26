# Technische Annahmen und offene Fragen

## Annahmen (dokumentiert, bewusst so entschieden)

1. **Stack:** Ein Next.js-Full-Stack-Projekt statt getrenntem Frontend/Backend — ein Service, ein Deployment, ein Sprach-Stack für das 10-Tage-Fenster.
2. **Modell-IDs:** `muse-spark-1.3` (Vision/Text/Structured Output) und `muse-image-1.0` (Bildgenerierung + -Bearbeitung) über Meta Model API (`https://api.meta.ai/v1`, Bearer Token, OpenAI-SDK-kompatibel). IDs vor dem ersten Call gegen `/v1/models` verifizieren.
3. **Produktkatalog:** IKEA-US-Datensatz (Juli 2025) als einzige Quelle — reale Produkte, Preise, Links. Kein Live-Scraping im Prototyp.
4. **Währung:** Budget-Input in CHF, Katalogpreise USD → fixer Kurs + UI-Kennzeichnung.
5. **Raumtyp:** Prototyp beschränkt sich auf Wohnzimmer (gemäss Projektidee).
6. **Keine Nutzerkonten/DB:** Sessions im Client-State; Persistenz optional (Phase 3, localStorage/SQLite).
7. **Standard-Mode der Model API** (Meta trainiert nicht mit unseren Prompts) — für Nutzeraufnahmen von Räumen wichtig.

## Offene Fragen

| Frage | Auswirkung | Wann klären |
|---|---|---|
| Dataset-Lizenz von ikea-us-products-2025 nicht explizit angegeben — reicht Quellenangabe für die Nutzung? | niedrig (Hackathon-Prototyp mit Kennzeichnung) | Tag 1 |
| Wie originalgetreu bleibt `muse-image-1.0` die Raumgeometrie beim Edit? Bestimmt die Bildqualität der Demo. | hoch | Tag 1–2 mit Testbildern |
| Offizielle Regeln des Hackathons wurden erst zum Kickoff (26.10.) veröffentlicht — gibt es zwingende Submission-Anforderungen (Repo öffentlich? Demo-Link?)? | mittel | Tag 1 (dev.meta.ai prüfen) |
| Genügt der USD→CHF-Fixkurs für die Jury, oder braucht es echte CHF-Preise (IKEA CH)? | mittel | Tag 5 entscheiden |
| Rate Limits: Muse Image 150 req/min (pro Team) — für die Demo unkritisch, aber Caching der Ergebnisse einbauen? | niedrig | Tag 5 |
| API-Key: braucht es eine Kreditkarte, um die $150 Credits zu aktivieren? | blockierend, falls ja | Tag 1 sofort |
