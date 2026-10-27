// Spike: Erzeugt Testbilder mit bekannten Schäden (Ground Truth) per muse-image-Edit.
// Aufruf: node scripts/spike/generate-damage.mjs <input.png> <out-dir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { BASE, KEY, IMAGE } from "./env.mjs";

const [input, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const CASES = [
  { id: "hole-wall", truth: "fist-sized hole in the wall", prompt: "Add one realistic fist-sized hole with broken drywall edges in the largest visible wall. Change nothing else." },
  { id: "floor-scratches", truth: "deep scratches on the floor", prompt: "Add several long, deep, clearly visible scratches and gouges to the floor in the foreground. Change nothing else." },
  { id: "coffee-stain", truth: "large brown coffee stain on the sofa or rug", prompt: "Add one large brown coffee spill stain on the sofa or rug. Change nothing else." },
  { id: "wall-marks", truth: "crayon drawings and dirty marks on the wall", prompt: "Add children's crayon scribbles and grey scuff marks on a wall at knee height. Change nothing else." },
  { id: "subtle-dowel-holes", truth: "a few small dowel/screw holes in the wall (subtle)", prompt: "Add three small screw holes with dowel remnants in a wall, where a picture used to hang. Keep them small and realistic. Change nothing else." },
];

const src = await sharp(readFileSync(input)).resize({ width: 1280, withoutEnlargement: true }).png().toBuffer();
writeFileSync(path.join(outDir, "clean.png"), src);

const truthPath = path.join(outDir, "truth.json");
let truths = { "clean.png": "no damage (control image)" };
try { truths = { ...JSON.parse(readFileSync(truthPath, "utf8")), ...truths }; } catch {}
await Promise.all(CASES.filter((c) => !only || c.id === only).map(async (c) => {
  const form = new FormData();
  form.append("model", IMAGE);
  form.append("prompt", `Photorealistic edit of this apartment photo. ${c.prompt} Keep camera, geometry, furniture and lighting identical.`);
  form.append("image[0]", new File([src], "room.png", { type: "image/png" }));
  const t0 = Date.now();
  const res = await fetch(`${BASE}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: form, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) { console.error(c.id, res.status, (await res.text()).slice(0, 300)); return; }
  const json = await res.json();
  const item = json.data?.[0];
  const buf = item?.b64_json ? Buffer.from(item.b64_json, "base64") : Buffer.from(await (await fetch(item.url)).arrayBuffer());
  writeFileSync(path.join(outDir, `${c.id}.png`), buf);
  truths[`${c.id}.png`] = c.truth;
  console.log(`${c.id}: ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}));
writeFileSync(truthPath, JSON.stringify(truths, null, 2));
