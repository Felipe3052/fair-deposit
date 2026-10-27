# Offene Fragen und technische Annahmen

## Mit dem offiziellen Participant Guide geklärt

- ✅ **Regeln:** Repos **müssen public** sein · Teamgrösse max. 4 (Solo erlaubt) · Demo-Video **genau 3 Minuten** (primäres Bewertungs-Artefakt, zusammen mit Code und Live-Produkt) · **New work only**, im Video klar als eigener Beitrag erkennbar.
- ✅ **Credits:** $150 Model API Credits mit Kreditkarte (Pre-Authorization wird erstattet; Spend-Limit-Notification im Billing einrichten; Claim bis 4. Nov 9 PM ET, individuell).
- ✅ **Anti-Projects:** u.a. "Simple Image Analyzers", "Basic RAG", **medizinische Ratschläge**, Politik. Fair Deposit grenzt sich als Agent mit erledigter Aufgabe (Report + Rechnung + Brief) ab; kein Gesundheitsbezug.
- ✅ **Daten-Rechte:** Disqualifikation bei "code, data, or assets" ohne Rechte → Quellen und Lizenzen in DATA-SOURCES.md.
- ✅ **Bewertung:** Impact 30% · Meta-Tooling 25% · Technical Depth 20% · Demo 25%; Top 5 pro Track ins Finale (9. Nov).
- ✅ **Preise:** Indie $150K/100K/75K/50K/25K. Bonus: Most Viral ($20K, X-Engagement bis 8. Nov), Best Open Weights ($10K, Muse Glimmer/Spark Open), Community Vote ($10K), Best Agentic ($5K), Best Creative Build ($5K, Muse Image/Wonder).
- ✅ **Partner-Credits:** Baseten $100 (max. 2'000 Teilnehmende, Modell-ID `meta-models/muse-spark-open-1026`), Modal $100 (erste 1'000), Fireworks $25 (Auswahl).

## Annahmen (bewusst so entschieden)

1. **Stack:** Ein Next.js-Full-Stack-Projekt — ein Service, ein Deployment.
2. **Modelle:** `muse-spark-1.3` (Agent, Vision, Text), `sam-3.1` (Masken), optional `muse-spark-open-1026`; `muse-image-1.0` nur für Test-/Demo-Daten.
3. **Das Modell rechnet nie:** Lebensdauern aus Rule Packs, Beträge aus der Forderung des Vermieters oder Nutzereingabe, Summen in Code.
4. **Rule Packs:** Schweiz vollständig zitiert, generisches Paket als Schätzung. Global verständlich, Schweiz nur als Ursprung der Idee.
5. **Nicht Rechtsberatung:** Formulierung als Einschätzung mit Quellen.
6. **Eingabe Fotos, nicht Video** (Video-Rundgang ist Stretch Goal).
7. **Keine Nutzerkonten/DB, keine Speicherung von Nutzerfotos.**
8. **Standard-Mode der Model API** (Meta trainiert nicht mit unseren Prompts) — wichtig für private Wohnungsfotos.

## Offene Fragen

| Frage | Auswirkung | Wann klären |
|---|---|---|
| Erkennt Spark kleine Schäden (Dübellöcher, feine Kratzer) auf Raumübersichten, wenn der Agent in Kacheln zoomt? Spike war hier nicht aussagekräftig | hoch | Tag 3 |
| Wie hoch ist die Fehlalarm-Rate auf echten, unbeschädigten Wohnungsfotos (Schatten, Reflexe, Maserung)? | hoch | Tag 5 (Demo-Datensatz) |
| Offizielle Fassung und Lizenz der paritätischen Lebensdauertabelle — darf sie in Werten übernommen und zitiert werden? | mittel | Tag 3 |
| Wie zuverlässig ist der Einzug-vs-Auszug-Vergleich bei unterschiedlichem Blickwinkel/Licht? | mittel | Tag 5 |
| Unterstützt die SAM-3.1-API Video (Parser kann es)? Nur relevant für Stretch Goal | niedrig | bei Bedarf |
| Läuft der Inspektions-Pass mit Muse Spark Open in vergleichbarer Qualität (Open-Weight-Bonus)? Abhängig von Baseten/Modal-Credits | mittel | Tag 7 |
| Name "Fair Deposit": Kollision mit bestehenden Produkten/Marken? | niedrig | vor dem Public-Schalten (3. Nov) |
