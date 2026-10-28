import sharp from "sharp";
import type { Box } from "@/lib/agent/types";

const MAX_SIDE = 1600;

export interface NormalizedImage {
  buffer: Buffer;
  dataUrl: string;
  width: number;
  height: number;
}

async function toNormalized(pipeline: ReturnType<typeof sharp>): Promise<NormalizedImage> {
  const { data, info } = await pipeline.jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
  return { buffer: data, dataUrl: `data:image/jpeg;base64,${data.toString("base64")}`, width: info.width, height: info.height };
}

/** EXIF-Rotation anwenden, auf max. 1600 px skalieren, als JPEG. Alle Befund-Koordinaten beziehen sich auf dieses Bild. */
export async function normalizeImage(dataUrl: string): Promise<NormalizedImage> {
  const b64 = dataUrl.replace(/^data:image\/[\w+.-]+;base64,/, "");
  return toNormalized(
    sharp(Buffer.from(b64, "base64")).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
  );
}

/** Ausschnitt mit Rand, auf mind. 1024 px Breite hochskaliert (für Zoom und Gegenprüfung). */
export async function cropRegion(image: NormalizedImage, box: Box, padding = 0.15): Promise<{ crop: NormalizedImage; region: Box }> {
  const padX = Math.round((box.right - box.left) * padding) + 8;
  const padY = Math.round((box.bottom - box.top) * padding) + 8;
  const region = clampBox({ left: box.left - padX, top: box.top - padY, right: box.right + padX, bottom: box.bottom + padY }, image.width, image.height);
  const crop = await toNormalized(
    sharp(image.buffer)
      .extract({ left: region.left, top: region.top, width: region.right - region.left, height: region.bottom - region.top })
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: false })
  );
  return { crop, region };
}

export function clampBox(box: Box, width: number, height: number): Box {
  const left = Math.max(0, Math.min(width - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(height - 1, Math.round(box.top)));
  return {
    left,
    top,
    right: Math.max(left + 1, Math.min(width, Math.round(box.right))),
    bottom: Math.max(top + 1, Math.min(height, Math.round(box.bottom))),
  };
}

/** Box aus 0–1000-Koordinaten (Spark-Ausgabe) in Pixel eines Bildes/Ausschnitts. */
export function boxFromNormalized(coords: number[], width: number, height: number): Box {
  const [x1 = 0, y1 = 0, x2 = 1000, y2 = 1000] = coords.map(Number);
  return clampBox(
    { left: (Math.min(x1, x2) / 1000) * width, top: (Math.min(y1, y2) / 1000) * height, right: (Math.max(x1, x2) / 1000) * width, bottom: (Math.max(y1, y2) / 1000) * height },
    width,
    height
  );
}

/** Box aus einem Ausschnitt zurück in Koordinaten des Originalbildes. */
export function mapFromCrop(box: Box, region: Box, crop: { width: number; height: number }): Box {
  const sx = (region.right - region.left) / crop.width;
  const sy = (region.bottom - region.top) / crop.height;
  return {
    left: Math.round(region.left + box.left * sx),
    top: Math.round(region.top + box.top * sy),
    right: Math.round(region.left + box.right * sx),
    bottom: Math.round(region.top + box.bottom * sy),
  };
}

export function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const inter = ix * iy;
  const area = (r: Box) => (r.right - r.left) * (r.bottom - r.top);
  return inter === 0 ? 0 : inter / (area(a) + area(b) - inter);
}

/** Anteil von a, der innerhalb von b liegt. */
export function coverage(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const area = (a.right - a.left) * (a.bottom - a.top);
  return area === 0 ? 0 : (ix * iy) / area;
}

/** Verkleinerte Kopie mit rot markierter Box (für Vergleiche über mehrere Fotos, ein Bild ≈ 1024 px). */
export async function markedPreview(image: NormalizedImage, box: Box | null, maxSide = 1024): Promise<NormalizedImage> {
  const stroke = Math.max(4, Math.round(Math.max(image.width, image.height) / 200));
  const overlay = box
    ? [{
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}"><rect x="${box.left}" y="${box.top}" width="${box.right - box.left}" height="${box.bottom - box.top}" fill="none" stroke="#ff2d2d" stroke-width="${stroke}" rx="${stroke * 2}"/></svg>`),
      }]
    : [];
  const marked = await sharp(image.buffer).composite(overlay).jpeg({ quality: 88 }).toBuffer();
  return toNormalized(sharp(marked).resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true }));
}
