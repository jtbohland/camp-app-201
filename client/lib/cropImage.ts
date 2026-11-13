/**
 * Scales an image down so its longest side is at most `maxSize`, and returns a data URL.
 * Keeps transparency for PNG/WebP sources (exported as PNG); photos export as JPEG.
 */
export async function shrinkImage(src: string, opts: { maxSize: number; keepAlpha: boolean }): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, opts.maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that image");
  if (!opts.keepAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return opts.keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = src;
  });
}
