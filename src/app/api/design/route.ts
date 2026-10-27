import { NextRequest } from "next/server";
import { designRequestSchema, type FurnitureSelection } from "@/lib/agent/types";
import { runDesignAgent } from "@/lib/agent/design-agent";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * POST /api/design — multipart: image, style, budgetChf
 * Gibt SSE-Stream der Agent-Steps zurück (DesignEvent als JSON-Linien).
 */
export async function POST(req: NextRequest) {
  let style: string;
  let budgetChf: number;
  let imageBase64: string;
  let changeRequest: string;
  let furnitureSelection: FurnitureSelection;

  try {
    const contentLength = Number(req.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMAGE_BYTES + 1024 * 1024
    ) {
      return Response.json(
        { error: "Der Upload darf höchstens 10 MB gross sein." },
        { status: 413 }
      );
    }

    const form = await req.formData();
    const image = form.get("image");
    const styleRaw = form.get("style");
    const budgetRaw = form.get("budgetChf");
    const changeRequestRaw = form.get("changeRequest");
    const furnitureSelectionRaw = form.get("furnitureSelection");

    if (
      !(image instanceof File) ||
      typeof styleRaw !== "string" ||
      !budgetRaw ||
      typeof changeRequestRaw !== "string" ||
      typeof furnitureSelectionRaw !== "string"
    ) {
      return Response.json(
        {
          error:
            "image, style, budgetChf, changeRequest (darf leer sein) und furnitureSelection sind erforderlich",
        },
        { status: 400 }
      );
    }
    if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: "Das Bild muss vorhanden sein und darf höchstens 10 MB gross sein." },
        { status: image.size > MAX_IMAGE_BYTES ? 413 : 400 }
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return Response.json(
        { error: "Erlaubte Bildformate sind JPEG, PNG und WebP." },
        { status: 415 }
      );
    }
    budgetChf = Number(budgetRaw);
    style = styleRaw.trim();
    changeRequest = changeRequestRaw.trim();
    let parsedFurnitureSelection: unknown;
    try {
      parsedFurnitureSelection = JSON.parse(furnitureSelectionRaw);
    } catch {
      return Response.json({ error: "Möbelauswahl ist ungültig." }, { status: 400 });
    }
    furnitureSelection = parsedFurnitureSelection as FurnitureSelection;
    const buffer = Buffer.from(await image.arrayBuffer());
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp =
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
    if (!(isJpeg || isPng || isWebp)) {
      return Response.json(
        { error: "Der Upload enthält kein gültiges JPEG-, PNG- oder WebP-Bild." },
        { status: 415 }
      );
    }
    imageBase64 = `data:${image.type};base64,${buffer.toString("base64")}`;

    const parsed = designRequestSchema.safeParse({
      imageBase64,
      style,
      budgetChf,
      changeRequest,
      furnitureSelection,
    });
    if (!parsed.success) {
      return Response.json(
        { error: "Ungültiger Request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    furnitureSelection = parsed.data.furnitureSelection;
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
          budgetChf,
          changeRequest,
          furnitureSelection
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
