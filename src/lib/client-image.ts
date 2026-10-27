// Browser-seitig: Fotos vor dem Upload verkleinern (gleiche Grenze wie der Server, 1600 px),
// damit die angezeigte Datei exakt dem Bild entspricht, auf das sich alle Befund-Koordinaten beziehen.

const MAX_SIDE = 1600;

export interface PreparedPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

export async function preparePhoto(source: Blob): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), width, height };
}

/** Liest einen SSE-Stream (`data: {...}\n\n`) und ruft onEvent pro Event auf. */
export async function readEventStream<T>(response: Response, onEvent: (event: T) => void): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (chunk.startsWith("data:")) onEvent(JSON.parse(chunk.slice(5).trim()) as T);
    }
  }
}
