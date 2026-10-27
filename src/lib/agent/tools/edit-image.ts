import { MODEL_IMAGE, metaClient } from "@/lib/meta-client";

export interface EditImageArgs {
  imageBase64: string;
  style: string;
  keep: string[];
  replace: { label: string; category: string }[];
  products: { title: string; category: string; imageUrl: string | null }[];
}

const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;

async function fetchProductReference(
  product: EditImageArgs["products"][number]
): Promise<File | null> {
  if (!product.imageUrl) return null;
  const url = new URL(product.imageUrl);
  if (url.origin !== "https://www.ikea.com" || !url.pathname.startsWith("/us/en/images/products/")) {
    return null;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) return null;
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(mimeType)) return null;
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_REFERENCE_IMAGE_BYTES) return null;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_REFERENCE_IMAGE_BYTES) return null;
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return new File([bytes], `product-reference.${extension}`, { type: mimeType });
}

/**
 * Raum-Redesign: muse-image-1.0 image-to-image-Edit des Originalfotos.
 * Das Bild soll exakt die gewählten Produkte zeigen — das schliesst den
 * Loop zwischen Visualisierung und Einkaufsliste.
 *
 * Das Raumfoto und die echten Katalogfotos werden in derselben Edit-Anfrage
 * übergeben. Die Referenzbilder verankern Form, Material und Farbe der Produkte.
 */
export async function editRoomImage(
  args: EditImageArgs
): Promise<string> {
  const client = metaClient();
  const keepTxt = args.keep.length
    ? `Unbedingt BEHALTEN (Position/Geometrie unverändert): ${args.keep.join(", ")}.`
    : "";
  const replaceTxt = args.replace.length
    ? `ERSETZEN: ${args.replace.map((item) => `${item.label} (${item.category})`).join(", ")}.`
    : "";
  // Base64 → File (Node 20+ hat File global)
  const mimeMatch = args.imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const b64 = args.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(b64, "base64");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const file = new File([buffer], `room.${extension}`, { type: mimeType });
  const fetchedReferences = await Promise.all(
    args.products.slice(0, 9).map(async (product) => {
      try {
        const file = await fetchProductReference(product);
        return file ? { product, file } : null;
      } catch (error) {
        console.warn(`Produktreferenz nicht abrufbar: ${product.title}`, error);
        return null;
      }
    })
  );
  const references = fetchedReferences.filter((reference): reference is NonNullable<typeof reference> => reference !== null);
  const productsTxt = references.length
    ? `Bild 1 ist der Ausgangsraum. Verwende die folgenden echten IKEA-Produktbilder als verbindliche Referenzen: ${references.map(({ product }, index) => {
        const target = args.replace.find((item) => item.category === product.category)?.label ?? product.category;
        return `Bild ${index + 2}: ${product.title} → ersetze damit ${target}`;
      }).join("; ")}. Übernimm für jedes Produkt Silhouette, Form, Proportionen, Material, Farbe und Gestell aus genau seiner Referenz. Ein rundes Produkt bleibt rund; mache daraus keine eckige Variante. Erfinde keine ähnlichen Ersatzmöbel.`
    : `Produktnamen als Orientierung: ${args.products.map((product) => product.title).join("; ")}.`;
  const prompt = [
    `Redesigne diesen Wohnraum im Stil "${args.style}".`,
    keepTxt,
    replaceTxt,
    productsTxt,
    "Bild 1 ist ausschliesslich der Raum und bleibt die unveränderte räumliche Grundlage.",
    "Behalte Raumgeometrie, Wände, Fenster, Perspektive und sämtliche als BEHALTEN markierten Möbel exakt bei.",
    "Photorealistisch, natürliches Licht.",
  ].filter(Boolean).join(" ");
  const inputImages = [file, ...references.map(({ file: reference }) => reference)];

  const form = new FormData();
  form.append("model", MODEL_IMAGE);
  form.append("prompt", prompt);
  // Meta expects image[0], image[1], ...; the OpenAI SDK serializes arrays as image[].
  inputImages.forEach((image, index) => form.append(`image[${index}]`, image));
  const response = await fetch(`${client.baseURL.replace(/\/$/, "")}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${client.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`muse-image (${response.status}): ${details.slice(0, 500)}`);
  }
  const res = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };

  const first = res.data?.[0];
  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }
  if (first?.url) {
    return first.url;
  }
  throw new Error("muse-image: keine Bilddaten in der Antwort");
}
