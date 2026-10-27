// Spike: Kann muse-spark Wohnungsschäden erkennen und SAM 3.1 sie präzise maskieren?
// Aufruf: node scripts/spike/detect-damage.mjs <image-dir> <out-dir>
// Pro Bild: Spark → JSON-Liste mit Schäden + Box, SAM → Maske per Box-Prompt, Overlay-PNG + results.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import OpenAI from "openai";
import { buildObjectPrompt, decodeMaskToSVGPath, parseImageStream, recordsOfKind } from "@meta-sam/parser";
import { BASE, KEY, SPARK, SAM } from "./env.mjs";

const [imageDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const client = new OpenAI({ baseURL: BASE, apiKey: KEY, timeout: 120_000, maxRetries: 1 });

const PROMPT = `You are a meticulous move-out apartment inspector. Inspect this photo for ANY damage, dirt or wear on walls, floors, ceilings, doors, windows, fixtures and built-ins (furniture only if it looks like part of the apartment).
For each finding, decide whether it is "normal_wear" (expected from ordinary use over time, e.g. light scuffs, faded paint, minor floor wear) or "damage" (beyond ordinary use, e.g. holes, deep gouges, large stains, cracks, burns, water damage, drawings).
Do NOT invent findings. If the surface is fine, return an empty list. Only report what is clearly visible.
Return ONLY JSON:
{"findings":[{"label":"short English noun phrase, e.g. 'hole in wall'","category":"hole|scratch|stain|crack|marks|water_damage|mold|peeling_paint|other","surface":"wall|floor|ceiling|door|window|fixture|furniture|other","classification":"normal_wear|damage","severity":"minor|moderate|severe","description":"one sentence","box":[x1,y1,x2,y2],"confidence":0.0}]}
"box" is the tight bounding box in coordinates normalized to 0-1000 (x to the right, y downward, origin top-left).`;

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { findings: [] };
}

async function sparkFindings(dataUrl) {
  const res = await client.chat.completions.create({
    model: SPARK,
    max_tokens: 6000,
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: dataUrl } }] }],
  });
  return { findings: parseJson(res.choices[0].message.content ?? "").findings ?? [], usage: res.usage };
}

async function samMask(dataUrl, input_text) {
  const events = await client.responses.create({
    model: SAM,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: input_text }, { type: "input_image", image_url: dataUrl, detail: "auto" }] }],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  const parsed = await parseImageStream(events).finalResult;
  return recordsOfKind(parsed.records, "mask");
}

const files = readdirSync(imageDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const all = {};
for (const file of files) {
  const t0 = Date.now();
  const buf = await sharp(readFileSync(path.join(imageDir, file))).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const { width, height } = await sharp(buf).metadata();
  const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  let findings = [];
  try {
    ({ findings } = await sparkFindings(dataUrl));
  } catch (e) {
    console.error(file, "spark failed:", e.message);
  }
  const tSpark = Date.now() - t0;

  // SAM: Box-Prompt aus Sparks Box (Pixel), verfeinert zu einer echten Maske.
  const overlays = [];
  await Promise.all(findings.map(async (f, i) => {
    const [x1, y1, x2, y2] = f.box ?? [];
    const px = (v, max) => Math.max(0, Math.min(max - 1, Math.round((v / 1000) * max)));
    const box = { left: px(x1, width), top: px(y1, height), right: Math.max(px(x1, width) + 1, px(x2, width)), bottom: Math.max(px(y1, height) + 1, px(y2, height)) };
    f.pixelBox = box;
    try {
      // SAM_MODE=text: Konzept-Prompt mit Sparks Label statt Box (besser für dünne/verstreute Schäden?)
      const prompt = process.env.SAM_MODE === "text"
        ? String(f.label)
        : buildObjectPrompt({ size: { width, height }, objects: [{ id: 0, prompts: [{ box }] }] });
      const masks = await samMask(dataUrl, prompt);
      f.samMasks = masks.length;
      f.samConfidence = masks[0]?.confidence ?? null;
      for (const m of masks) {
        const b = m.bounds;
        overlays.push(`<path d="${decodeMaskToSVGPath(m.mask)}" transform="translate(${b.left},${b.top}) scale(${(b.right - b.left) / m.mask.width},${(b.bottom - b.top) / m.mask.height})" fill="rgba(255,0,60,0.45)"/>`);
      }
    } catch (e) {
      f.samError = e.message.slice(0, 200);
    }
    const color = f.classification === "damage" ? "#ff2d55" : "#ffcc00";
    overlays.push(`<rect x="${box.left}" y="${box.top}" width="${box.right - box.left}" height="${box.bottom - box.top}" fill="none" stroke="${color}" stroke-width="3"/>`);
    overlays.push(`<text x="${box.left + 4}" y="${Math.max(16, box.top - 6)}" font-family="Arial" font-size="18" font-weight="bold" fill="${color}" stroke="black" stroke-width="0.6">${i + 1}. ${String(f.label).replace(/[<&>]/g, "")} (${f.classification})</text>`);
  }));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${overlays.join("")}</svg>`;
  await sharp(buf).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 85 }).toFile(path.join(outDir, file.replace(/\.\w+$/, ".overlay.jpg")));
  all[file] = { seconds: { spark: tSpark / 1000, total: (Date.now() - t0) / 1000 }, findings };
  console.log(`${file}: ${findings.length} findings (spark ${(tSpark / 1000).toFixed(1)}s, total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const [i, f] of findings.entries()) console.log(`   ${i + 1}. [${f.classification}/${f.severity}] ${f.label} — conf ${f.confidence} — SAM masks: ${f.samMasks ?? "err " + f.samError}`);
}
writeFileSync(path.join(outDir, "results.json"), JSON.stringify(all, null, 2));
