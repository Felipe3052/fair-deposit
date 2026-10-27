import { NextRequest } from "next/server";
import { segmentFurniture } from "@/lib/agent/tools/segment-furniture";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 64 * 1024) {
      return Response.json({ error: "Der Upload darf höchstens 10 MB gross sein." }, { status: 413 });
    }
    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: "Bitte ein Bild bis maximal 10 MB hochladen." },
        { status: image instanceof File && image.size > MAX_IMAGE_BYTES ? 413 : 400 }
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return Response.json({ error: "Erlaubte Bildformate: JPEG, PNG oder WebP." }, { status: 415 });
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!(isJpeg || isPng || isWebp)) {
      return Response.json({ error: "Die Datei enthält kein gültiges JPEG-, PNG- oder WebP-Bild." }, { status: 415 });
    }
    const width = Number(form.get("width"));
    const height = Number(form.get("height"));
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 12000 || height > 12000) {
      return Response.json({ error: "Bildabmessungen sind ungültig." }, { status: 400 });
    }
    const imageDataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
    const objects = await segmentFurniture(imageDataUrl);
    return Response.json({ objects, width, height });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "SAM-Segmentierung fehlgeschlagen." },
      { status: 502 }
    );
  }
}
