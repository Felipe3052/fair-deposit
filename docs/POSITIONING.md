# Positionierung — Wettbewerbslandschaft und unser Differenzierungs-Wedge

Stand: 26. Okt 2026. Recherche über kommerzielle AI-Interior-Design-Tools.

## Die unbequeme Wahrheit: "AI Raum-Redesign + reale Produkte + Budget" ist marktbewiesen — aber nicht neu

Kommerzielle Tools, die genau das schon tun (Auswahl):

| Tool | Was es schon macht |
|---|---|
| **RoomGen** | Wählt reale Produkte **vor** der Generierung, splittet das Raum-Budget über Kategorien, Generator baut aus den gewählten Produkten, Retailer-Prefs inkl. IKEA |
| **MeltFlex AI** | Platziert **exakte** Produkte aus 9 Retailern (inkl. IKEA) **im Foto**, mit Preis + Kaufen-Link; hält Wände/Fenster bei |
| **REimagine Home** | "Real Products Discovery" (Checkout auf Amazon/Shopify), Budget- und ZIP-Inputs, Structure-Lock |
| **HomeDesigns AI** | "Furniture Finder", Structure-Lock, Shop-the-Render |
| **Coohom / Feiliu** | Reale Möbel in 3D in wahrem Massstab, shoppable Renders mit Cart |

Mehrere Review-Sites nennen "shoppable furniture" als **die grösste Entwicklung 2026** in dieser Kategorie.

**Konsequenz 1:** Unsere Kernidee ist validiert (echte Nachfrage, bezahlende Kunden bei Wettbewerbern) — aber der USP "reale Produkte + Budget" ist im Markt **Stand der Technik**, kein Differenzierer mehr. Im Pitch niemals "first to connect AI redesign with real products" behaupten — falsch, und die Jury kennt den Markt.

**Konsequenz 2:** Der Hackathon-Sieg kommt nicht aus der Idee, sondern aus drei Wedges, die **keines** der kommerziellen Tools hat:

## Wedge 1 — Der komplette Loop auf Metas Stack (Meta-Tooling 25% + Technical Depth 20%)

Kein kommerzielles Tool orchestriert **SAM 3.1 + Muse Spark + Muse Image als ein Agent-System**. Unsere Pipeline:

```
muse-spark (Agent, Tool-Loop)
 ├─ tool: analyze_room        Vision-Analyse (Structured Output)
 ├─ tool: segment_furniture   SAM 3.1 → Masken für Behalten/Ersetzen
 ├─ tool: plan_budget         Budget-Split über Kategorien (programmatisch)
 ├─ tool: search_catalog      echte Produkte per ID aus lokalem Katalog
 ├─ tool: edit_room_image     muse-image-1.0 mit Produkt-Referenzbildern
 └─ tool: verify              Konsistenz-Check (Summe ≤ Budget, Bild ↔ Liste)
```

Der Agent entscheidet selbst und iteriert: Budget überschritten → günstigere Alternativen; Bild passt nicht zu gewähltem Produkt → Re-Edit mit schärferem Prompt. Das ist "beyond a basic integration" und zielt direkt auf den Bonus-Preis **Best Agentic Use-Case**.

## Wedge 2 — Schweizer Fokus (Impact 30%, Theme "Build for Your World")

Das Theme verlangt: *"Solve a problem you know firsthand."* Kein kommerzielles Tool bedient die Schweiz:

- **CHF-Budgets** mit transparenter Rechnung (kein USD-Proxy)
- **Schweizer Verfügbarkeit** (IKEA CH; optional Pfister/Micasa) statt US-Retailer
- Story: Möbel-Einrichtung in der Schweiz ist teuer und intransparent — ein Agent, der ein CHF-Budget ernst nimmt, ist ein Problem, das du selbst kennst

Zielbild nach dem Hackathon: IKEA-CH-Katalog mit echten CHF-Preisen statt des US-Datensatzes.

## Wedge 3 — Behalten/Ersetzen mit SAM 3.1 (Demo 25%)

Interaktive Auswahl: SAM 3.1 segmentiert die vorhandenen Möbel, der Nutzer klickt an, was bleibt und was raus soll. Die Masken steuern den Muse-Image-Edit — das Original bleibt garantiert da, wo der Nutzer es will. Vorher/Nachher mit sichtbarer Kontrolle ist der **Videomoment** für das 3-Minuten-Video.

## Verkaufs-Einzeiler (Pitch)

> *"Jedes AI-Raumdesign-Tool zeigt dir ein Bild voller Möbel, die es nicht gibt. Unser Agent segmentiert deinen Raum mit SAM 3.1, plant ein echtes CHF-Budget, wählt kaufbare Produkte aus einem echten Katalog und redigiert dein Foto so, dass das Bild exakt die Einkaufsliste zeigt — alles auf Metas Modellen."*

## Realistische Ziellinie

| Ziel | Weg |
|---|---|
| Bonus "Best Agentic Use-Case" ($5'000) | Wedge 1 sauber und sichtbar umsetzen |
| Bonus "Best Creative Build" ($5'000) | Wedge 3 + Muse-Image-Multi-turn-Qualität |
| Top 5 Indie ($25K–75K) | Alle drei Wedges + starkes 3-Min-Video + lauffähiger Live-Demo |
