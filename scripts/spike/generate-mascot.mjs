// Erzeugt das Maskottchen (Inspektor-Variante) per muse-image aus einem Text-Prompt.
// Aufruf: node scripts/spike/generate-mascot.mjs <out-dir> [anzahl]
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { BASE, KEY, IMAGE } from "./env.mjs";

const [outDir, count = "2"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const prompt = "3D render of a cute fluffy plush mascot character: soft cream-beige fur covering the whole body like a hooded onesie, "
  + "a smooth pale oval face with two small round black eyes, rosy pink cheeks and a tiny smile, chubby short arms and legs. "
  + "The character is a friendly home inspector: holding a wooden clipboard in one hand and a magnifying glass in the other. "
  + "Full body, standing, centered, soft studio lighting, plain pure white background, no text, no logos.";

await Promise.all(Array.from({ length: Number(count) }, async (_, i) => {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGE, prompt, size: "1024x1024" }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) { console.error(i, res.status, (await res.text()).slice(0, 300)); return; }
  const item = (await res.json()).data?.[0];
  const buf = item?.b64_json ? Buffer.from(item.b64_json, "base64") : Buffer.from(await (await fetch(item.url)).arrayBuffer());
  writeFileSync(path.join(outDir, `mascot-${i + 1}.png`), buf);
  console.log(`mascot-${i + 1}: ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}));
