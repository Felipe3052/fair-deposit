import { NextRequest } from "next/server";
import { designRequestSchema } from "@/lib/agent/types";
import { runDesignAgent } from "@/lib/agent/design-agent";

/**
 * POST /api/design — multipart: image, style, budgetChf
 * Gibt SSE-Stream der Agent-Steps zurück (DesignEvent als JSON-Linien).
 */
export async function POST(req: NextRequest) {
  let style: string;
  let budgetChf: number;
  let imageBase64: string;

  try {
    const form = await req.formData();
    const image = form.get("image");
    const styleRaw = form.get("style");
    const budgetRaw = form.get("budgetChf");

    if (!(image instanceof File) || typeof styleRaw !== "string" || !budgetRaw) {
      return Response.json(
        { error: "image (File), style (string) und budgetChf sind erforderlich" },
        { status: 400 }
      );
    }
    budgetChf = Number(budgetRaw);
    style = styleRaw.trim();
    const buffer = Buffer.from(await image.arrayBuffer());
    imageBase64 = buffer.toString("base64");

    const parsed = designRequestSchema.safeParse({
      imageBase64,
      style,
      budgetChf,
    });
    if (!parsed.success) {
      return Response.json(
        { error: "Ungültiger Request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
  } catch {
    return Response.json({ error: "Multipart-Formular unlesbar" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        for await (const event of runDesignAgent(
          imageBase64,
          style,
          budgetChf
        )) {
          send(event);
          if (event.type === "done" || event.type === "error") break;
        }
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
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
