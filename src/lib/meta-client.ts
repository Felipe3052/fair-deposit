import OpenAI from "openai";

/**
 * Meta Model API Client (OpenAI-SDK-kompatibel).
 * Budget-Diskiplin: maxRetries: 1 (keine teuren Wiederholungen), Timeout 90s.
 */
let _client: OpenAI | null = null;

export function metaClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) throw new Error("MODEL_API_KEY fehlt (.env)");
    _client = new OpenAI({
      baseURL: process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1",
      apiKey,
      timeout: 90_000,
      maxRetries: 1,
    });
  }
  return _client;
}

export const MODEL_SPARK = process.env.MODEL_SPARK ?? "muse-spark-1.3";
export const MODEL_IMAGE = process.env.MODEL_IMAGE ?? "muse-image-1.0";

/** muse-spark ist ein Reasoning-Modell: braucht grosszügige max_tokens (siehe docs/ARCHITECTURE.md). */
export const SPARK_MAX_TOKENS = 3000;
