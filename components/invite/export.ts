import { CARD_H, CARD_W } from "./catalog";
import { FONT_FILES } from "./fonts";

/* Turns a rendered card into a downloadable PNG. */

const fontData = new Map<string, Promise<string>>();
/** Fetches a bundled font once and returns it as a data: URL. */
function inlineFont(url: string): Promise<string> {
  if (!fontData.has(url)) {
    fontData.set(
      url,
      fetch(url)
        .then((r) => r.blob())
        .then(
          (b) =>
            new Promise<string>((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(String(fr.result));
              fr.onerror = rej;
              fr.readAsDataURL(b);
            }),
        ),
    );
  }
  return fontData.get(url)!;
}

/**
 * Renders the SVG to a PNG blob at full size. An SVG drawn as an image can't load
 * external files, so the bundled fonts are inlined first; otherwise the PNG would
 * fall back to system fonts and not match the preview.
 */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  let xml = new XMLSerializer().serializeToString(svg);
  for (const [, url] of FONT_FILES) xml = xml.split(`url('${url}')`).join(`url('${await inlineFont(url)}')`);
  await document.fonts?.ready;
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Couldn't render the card"));
      img.src = url;
    });
    // Give the embedded fonts a moment to decode before drawing.
    await new Promise((r) => setTimeout(r, 120));
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, CARD_W, CARD_H);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
