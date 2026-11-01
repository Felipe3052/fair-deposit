# Fair Deposit — Move-out Inspection Agent (Meta Global AI Developer Hackathon)

> *"Every renter dreads move-out day. Fair Deposit is an AI agent built on Meta's models: it inspects your photos, separates normal wear from real damage, proves every finding with a SAM 3.1 mask, and calculates what you actually owe under your local depreciation rules — then drafts your reply to the landlord."*

**Live demo:** https://fair-deposit-73nv.vercel.app — click *Watch the agent inspect an apartment* for a recorded run (no wait), or upload your own move-in and move-out photos for a live inspection (rate-limited to protect the API budget).

**Status:** built during the hackathon (Oct 26 – Nov 4, 2026); see [docs/PLAN.md](docs/PLAN.md).

*Not legal advice.* The app gives an estimate with cited sources; generic rule packs are explicitly marked as estimates.

## How it works

1. Upload move-out photos (overview + close-ups), optionally move-in photos and the landlord's claimed amounts.
2. A **Muse Spark agent** inspects each photo, zooms into suspicious regions, and classifies every finding as *normal wear* or *damage*.
3. **SAM 3.1** produces a pixel-accurate mask as evidence for each finding — the agent picks a box or concept prompt depending on the damage type.
4. **Code, not the model, does the math:** residual value of each component from a cited lifespan table → tenant's fair share per claimed item.
5. The agent verifies its own report (evidence present, rules cited, totals consistent, second-pass check of each damage finding) and drafts a reply letter.

## Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js (App Router, TypeScript, Tailwind) — one service, API routes, SSE streaming of agent steps |
| Agent, inspection, verification, letter | `muse-spark-1.3` (Meta Model API, tool calling + vision) |
| Evidence masks | `sam-3.1` (Meta Model API, box and concept prompts) |
| Open weights | `meta-models/muse-spark-open-1026` via Baseten: `OPEN_WEIGHTS=1` runs the vision passes, `OPEN_WEIGHTS=all` runs the whole agent on open weights. Same demo result as hosted (USD 1,800 → 144, verified). |
| Test/demo images | `muse-image-1.0` generates move-in/move-out image pairs with known damage (development only) |
| Rules | Rule packs as JSON (`data/rules/`), e.g. Swiss joint lifespan table (cited) + generic depreciation (estimate) |

## Quickstart

```bash
npm install
cp .env.example .env    # add your Meta Model API key
npm run dev             # → http://localhost:3000
```

Feasibility spike (damage detection + masks on your own images):

```bash
node scripts/spike/detect-damage.mjs <image-dir> <out-dir>
```

## Documentation

- **[docs/POSITIONING.md](docs/POSITIONING.md)** — problem, competition, differentiation, prize strategy, spike results
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — agent loop, data models, API, code migration plan
- **[docs/PLAN.md](docs/PLAN.md)** — milestones until submission, demo checklist
- **[docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)** — rule pack sources, test image licenses, privacy
- **[docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md)** — assumptions and open questions

(Internal docs are written in German.)

## Built during the hackathon

All code in this repository was written during the event (Oct 26 – Nov 4, 2026). Git history documents the progress, including the pivot.
