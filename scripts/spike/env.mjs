// Spike-Helfer: .env laden und Meta-API-Basis bereitstellen (ohne Next.js).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const line of readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

export const BASE = (process.env.MODEL_API_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
export const KEY = process.env.MODEL_API_KEY;
export const SPARK = process.env.MODEL_SPARK || "muse-spark-1.3";
export const IMAGE = process.env.MODEL_IMAGE || "muse-image-1.0";
export const SAM = process.env.MODEL_SAM?.trim() || "sam-3.1";
if (!KEY) throw new Error("MODEL_API_KEY fehlt in .env");
