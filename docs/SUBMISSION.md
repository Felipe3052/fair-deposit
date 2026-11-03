# Submission-Texte (Entwurf, Englisch fürs Formular)

Links: Live https://fair-deposit-73nv.vercel.app · Repo https://github.com/Felipe3052/fair-deposit · Video: [YOUTUBE-LINK] · X-Post: [X-LINK]

## Tagline
Your landlord wants $1,800. What do you really owe? An AI agent that proves every damage with a pixel mask and computes your fair share in code.

## Short description (≈100 words)
Fair Deposit is a move-out inspection agent for tenants. Upload move-out (and optionally move-in) photos and the landlord's claimed amounts. A Muse Spark agent inspects each photo, zooms into suspicious regions and separates normal wear from real damage. SAM 3.1 produces a pixel-accurate mask as evidence for every finding, and move-in photos reveal damage that was already there. The math is done in code, not by the model: each component's residual value comes from a cited lifespan table. The agent verifies its own report and drafts the reply letter plus a PDF evidence report. In the demo, a $1,800 claim becomes $144.

## How we use Meta's models (Meta-Tooling)
- Muse Spark: tool-calling agent loop (inspect, zoom, compare with move-in, verify, draft letter) and vision.
- SAM 3.1: evidence masks; the agent chooses box or concept prompts per damage type.
- Open weights (muse-spark-open-1026 via Baseten): the whole agent also runs on open weights (`OPEN_WEIGHTS=all`) with the same demo result.
- Muse Image: generates the move-in/move-out demo pairs (disclosed in the video and the app).

## Technical depth
Rule packs are data, math is code (the model never computes money). Second-pass check rejects false alarms. SSE streaming of agent steps, recorded replay for the demo, rate limiting, mobile-ready UI.

## Impact
Security-deposit disputes affect millions of renters who cannot judge what deductions are fair. Evidence plus a transparent calculation gives tenants a basis for a factual reply. Not legal advice; generic rule packs are marked as estimates.

## Honest disclosures
Built during the hackathon (Oct 26 – Nov 4, 2026). Demo photos are partly synthetic (Muse Image). The demo button replays a recorded run of a real agent session.
