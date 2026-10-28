// Smoke-Test Open Weights: Muse Spark Open über Baseten (Modelliste, Text, Vision mit Demo-Foto).
// Aufruf: node scripts/spike/baseten-smoke.mjs [bild]
import { readFileSync } from "node:fs";
import "./env.mjs";

const KEY = process.env.BASETEN_API_KEY?.trim();
const BASE = (process.env.BASETEN_BASE_URL || "https://inference.baseten.co/v1").replace(/\/$/, "");
const MODEL = process.env.MODEL_SPARK_OPEN?.trim() || "meta-models/muse-spark-open-1026";
if (!KEY) throw new Error("BASETEN_API_KEY fehlt in .env");
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const models = await fetch(`${BASE}/models`, { headers });
const list = models.ok ? (await models.json()).data?.map((m) => m.id) ?? [] : [];
console.log(`/models ${models.status}:`, list.filter((id) => /muse|meta/i.test(id)).join(", ") || "(keine Meta-Modelle gelistet)");

async function chat(content) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return console.error(`  HTTP ${res.status}:`, JSON.stringify(body).slice(0, 400));
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s, tokens ${JSON.stringify(body.usage ?? {})}`);
  console.log("  ", (body.choices?.[0]?.message?.content ?? "").slice(0, 700));
}

console.log("\nText:");
await chat("Reply with exactly: ok");

const img = process.argv[2] ?? "public/demo/living-room-wall.jpg";
console.log(`\nVision (${img}):`);
await chat([
  { type: "text", text: 'List visible damage in this apartment photo (holes, scratches, stains, marks). Reply as JSON: {"findings":[{"label":string,"box":[x0,y0,x1,y1] normalized 0-1000}]}' },
  { type: "image_url", image_url: { url: "data:image/jpeg;base64," + readFileSync(img).toString("base64") } },
]);
