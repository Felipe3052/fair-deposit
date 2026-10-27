import { NextRequest } from "next/server";
import { inspectionRequestSchema } from "@/lib/agent/types";
import { runInspectionAgent } from "@/lib/agent/inspection-agent";

// Bis zu 12 Fotos à 10 MB als Base64 (+33%)
const MAX_BODY_BYTES = 12 * 14 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,/;

export const maxDuration = 300;

/**
 * POST /api/inspect — JSON (InspectionRequest).
 * Antwort: SSE-Stream der Agent-Events (InspectionEvent als `data:`-Zeilen).
 */
export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request too large (max. 12 photos, 10 MB each)." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = inspectionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const request = parsed.data;
  for (const photo of request.photos) {
    if (!DATA_URL.test(photo.imageBase64)) {
      return Response.json({ error: `Photo ${photo.id}: allowed formats are JPEG, PNG and WebP (data URL).` }, { status: 415 });
    }
    if ((photo.imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
      return Response.json({ error: `Photo ${photo.id} is larger than 10 MB.` }, { status: 413 });
    }
  }
  if (new Set(request.photos.map((p) => p.id)).size !== request.photos.length) {
    return Response.json({ error: "Photo ids must be unique." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        for await (const event of runInspectionAgent(request)) {
          send(event);
          if (event.type === "done" || event.type === "error") break;
        }
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
