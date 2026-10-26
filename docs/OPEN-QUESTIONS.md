# Offene Fragen und technische Annahmen

## Mit dem offiziellen Participant Guide (26. Okt) geklärt

- ✅ **Regeln veröffentlicht:** Repos **müssen public** sein · Teamgrösse max. 4 (Solo erlaubt) · Demo-Video **genau 3 Minuten** (primäres Bewertungs-Artefakt) · **New work only** — alles Gezeigte muss während des Hackathons entstanden sein und klar als eigener Beitrag identifizierbar sein.
- ✅ **Kreditkarte erforderlich** für die $150 Model API Credits (Formular + Card; Pre-Authorization wird erstattet; Spend-Limit-Notification im Billing einrichten; Claim bis 4. Nov 9 PM ET, individuell pro Person).
- ✅ **Anti-Projects:** Banned sind u.a. "Simple Image Analyzers", "Basic RAG Applications". Unser Projekt muss sich klar als **Multi-Step-Pipeline** lesen (Vision-Analyse → Bild-Redesign → Katalog-Auswahl per Structured Output → programmatische Budget-Logik), nicht als einfacher Bildanalysator. Bonus-Preis "Best Agentic Use-Case" ($5'000) passt dazu.
- ✅ **Lizenz/Daten-Rechte:** Projects werden disqualifiziert, wenn "code, data, or assets" ohne Rechte genutzt werden. Datensatz **nicht committen** (bereits gitignored ✓), Quelle im UI/README kennzeichnen, Dataset-Lizenz vor Abgabe prüfen.
- ✅ **Prämien:** Indie-Track bis $150K (1. Platz); Bonus "Best Creative Build" ($5'000, Muse Image!) und "Best Agentic Use-Case" ($5'000) sind realistische Zusatz-Chancen für dieses Projekt.

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
| Dataset-Lizenz von ikea-us-products-2025 nicht explizit angegeben — reicht Quellenangabe für die Nutzung? (Recht auf Daten ist **Disqualifikations-Kriterium**) | mittel | Tag 1 |
| Wie originalgetreu bleibt `muse-image-1.0` die Raumgeometrie beim Edit? Bestimmt die Bildqualität der Demo. | hoch | Tag 1–2 mit Testbildern |
| Genügt der USD→CHF-Fixkurs für die Jury, oder braucht es echte CHF-Preise (IKEA CH)? | mittel | Tag 5 entscheiden |
| Rate Limits: Muse Image 150 req/min (pro Team) — für die Demo unkritisch, aber Caching der Ergebnisse einbauen? | niedrig | Tag 5 |
