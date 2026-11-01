// Zeichnet einen echten Demo-Lauf auf (alle SSE-Events mit Zeitstempel) → public/demo/recorded-run.json.
// Die App spielt ihn über "Watch demo run" ab (Video, Live-Pitch ohne API-Risiko).
// Voraussetzung: Dev-Server auf http://localhost:3000. Daten identisch zu DEMO in InspectionApp.tsx.
// Aufruf: node scripts/record-demo-run.mjs
import { readFileSync, writeFileSync } from "node:fs";

const MOVE_OUT_DATE = "2026-10-31";
const photos = [
  ["demo-wall", "living-room-wall.jpg", "Living room — wall", "move_out"],
  ["demo-floor", "living-room-floor.jpg", "Living room — floor", "move_out"],
  ["demo-back-wall", "living-room-back-wall.jpg", "Living room — back wall", "move_out"],
  ["demo-overview", "living-room-overview.jpg", "Living room — overview", "move_out"],
  ["demo-move-in", "living-room-move-in.jpg", "Living room", "move_in"],
].map(([id, file, room, kind]) => ({ id, room, kind, imageBase64: "data:image/jpeg;base64," + readFileSync(`public/demo/${file}`).toString("base64") }));

const body = {
  rulePack: "generic",
  currency: "USD",
  tenancyStart: "2023-09-01",
  moveOutDate: MOVE_OUT_DATE,
  components: [{ component: "wall_paint", installedYear: 2023 }, { component: "parquet_finish", installedYear: 2020 }],
  photos,
  landlordClaims: [
    { id: "c1", description: "Repaint living room walls (hole, drawings)", amount: 600 },
    { id: "c2", description: "Sand and reseal parquet floor", amount: 800 },
    { id: "c3", description: "Replace kitchen countertop", amount: 400 },
  ],
};

const t0 = Date.now();
const res = await fetch("http://localhost:3000/api/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

const events = [];
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const chunks = buffer.split("\n\n");
  buffer = chunks.pop() ?? "";
  for (const chunk of chunks) {
    const line = chunk.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const event = JSON.parse(line.slice(5));
    events.push({ t: Date.now() - t0, event });
    if (event.type === "step") console.log(`${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s  ${event.summary}`);
  }
}

const report = events.find((e) => e.event.type === "done")?.event.data;
if (!report) throw new Error("Kein done-Event — Aufzeichnung verworfen");
if (!report.verification.passed) console.warn("WARNUNG: Report nicht verifiziert:", report.verification.issues);
writeFileSync("public/demo/recorded-run.json", JSON.stringify({ recordedAt: new Date().toISOString(), moveOutDate: MOVE_OUT_DATE, models: report.models, events }));
console.log(`\n${events.length} Events, ${Math.round((Date.now() - t0) / 1000)} s, ${report.modelCalls} model calls, verified ${report.verification.passed}`);
for (const f of report.findings) console.log(`  ${f.status.padEnd(11)} ${f.photoId.padEnd(15)} ${f.label}${f.moveIn ? ` → ${f.moveIn.verdict}: ${f.moveIn.reason}` : ""}`);
for (const l of report.lines) console.log(`  ${l.claimId} ${l.status} → ${l.tenantPays}`);
console.log(`  total ${report.totals.claimed} → ${report.totals.tenantPays} ${report.totals.currency}`);
