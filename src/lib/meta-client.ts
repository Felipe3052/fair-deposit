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
export const MODEL_SAM = process.env.MODEL_SAM?.trim() || "sam-3.1";

/** muse-spark ist ein Reasoning-Modell: braucht grosszügige max_tokens (siehe docs/ARCHITECTURE.md). */
export const SPARK_MAX_TOKENS = 3000;

/**
 * Open Weights (Bonuspreis): Muse Spark Open über Baseten, ebenfalls OpenAI-kompatibel.
 * OPEN_WEIGHTS=1 → Vision-Pässe (Inspektion, Gegenprüfung); OPEN_WEIGHTS=all → auch die Agent-Schleife.
 * SAM 3.1 bleibt auf der Meta Model API (kein Open-Weight-Ersatz).
 */
const OPEN_WEIGHTS = (process.env.OPEN_WEIGHTS ?? "0").trim().toLowerCase();
export const MODEL_SPARK_OPEN = process.env.MODEL_SPARK_OPEN?.trim() || "meta-models/muse-spark-open-1026";

let _openClient: OpenAI | null = null;

export function openWeightsClient(): OpenAI {
  if (!_openClient) {
    const apiKey = process.env.BASETEN_API_KEY;
    if (!apiKey) throw new Error("BASETEN_API_KEY fehlt (.env), OPEN_WEIGHTS ist aber aktiv");
    _openClient = new OpenAI({
      baseURL: process.env.BASETEN_BASE_URL ?? "https://inference.baseten.co/v1",
      apiKey,
      timeout: 120_000,
      maxRetries: 1,
    });
  }
  return _openClient;
}

export interface ReasoningModel { client: OpenAI; model: string; openWeights: boolean }

/** Modell für Bildbeurteilung (Inspektion, Zoom, Gegenprüfung). */
export function visionModel(): ReasoningModel {
  return OPEN_WEIGHTS === "1" || OPEN_WEIGHTS === "all"
    ? { client: openWeightsClient(), model: MODEL_SPARK_OPEN, openWeights: true }
    : { client: metaClient(), model: MODEL_SPARK, openWeights: false };
}

/** Modell für die Agent-Schleife (Tool-Calls). */
export function agentModel(): ReasoningModel {
  return OPEN_WEIGHTS === "all"
    ? { client: openWeightsClient(), model: MODEL_SPARK_OPEN, openWeights: true }
    : { client: metaClient(), model: MODEL_SPARK, openWeights: false };
}

/** Konfigurierte Modellnamen ohne Client-Erzeugung (für die Anzeige vor dem ersten Lauf). */
export function configuredModels(): { agent: string; vision: string; segmentation: string; openWeights: boolean } {
  const agent = OPEN_WEIGHTS === "all" ? MODEL_SPARK_OPEN : MODEL_SPARK;
  const vision = OPEN_WEIGHTS === "1" || OPEN_WEIGHTS === "all" ? MODEL_SPARK_OPEN : MODEL_SPARK;
  return { agent, vision, segmentation: MODEL_SAM, openWeights: agent === MODEL_SPARK_OPEN || vision === MODEL_SPARK_OPEN };
}
