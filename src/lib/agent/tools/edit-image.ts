import { MODEL_IMAGE, metaClient } from "@/lib/meta-client";

function toDataUrl(imageBase64: string): string {
  return imageBase64.startsWith("data:image")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;
}

export interface EditImageArgs {
  imageBase64: string;
  style: string;
  keep: string[];
  replace: string[];
  productTitles: string[]; // gewählte reale Produkte (Konsistenz Bild ↔ Liste!)
}

/**
 * Raum-Redesign: muse-image-1.0 image-to-image-Edit des Originalfotos.
 * Das Bild soll exakt die gewählten Produkte zeigen — das schliesst den
 * Loop zwischen Visualisierung und Einkaufsliste.
 *
 * Hinweis: Produkt-Referenzbilder als Multi-Image-Input sind Tag-5-Erweiterung
 * (muse-image unterstützt multi-turn Edits); der Prototyp beschreibt die
 * Produkte textuell im Prompt.
 */
export async function editRoomImage(
  args: EditImageArgs
): Promise<string> {
  const client = metaClient();
  const keepTxt = args.keep.length
    ? `Unbedingt BEHALTEN (Position/Geomtrie unverändert): ${args.keep.join(", ")}.`
    : "";
  const replaceTxt = args.replace.length
    ? `ERSETZEN: ${args.replace.join(", ")}.`
    : "";
  const productsTxt = args.productTitles.length
    ? `Das redesignierte Bild muss EXAKT diese realen Produkte zeigen (so dass das Bild der Einkaufsliste entspricht): ${args.productTitles.join("; ")}.`
    : "";

  const prompt = [
    `Redesigne diesen Wohnraum im Stil "${args.style}".`,
    keepTxt,
    replaceTxt,
    productsTxt,
    "Behalte Raumgeometrie, Wände, Fenster und Perspektive exakt bei.",
    "Photorealistisch, natürliches Licht.",
  ]
    .filter(Boolean)
    .join(" ");

  // Base64 → File (Node 20+ hat File global)
  const b64 = args.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(b64, "base64");
  const file = new File([buffer], "room.jpg", { type: "image/jpeg" });

  const res = await client.images.edit({
    model: MODEL_IMAGE,
    image: file,
    prompt,
  });

  const first = res.data?.[0];
  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }
  if (first?.url) {
    return first.url;
  }
  throw new Error("muse-image: keine Bilddaten in der Antwort");
}
