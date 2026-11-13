/**
 * Crops an image to a fixed aspect ratio around an anchor point with optional zoom, and returns a
 * data URL. Keeps transparency for PNG/WebP sources (exported as PNG); photos export as JPEG.
 */
export async function cropToAspect(
  src: string,
  opts: { aspect: number; focusX: number; focusY: number; zoom: number; outWidth: number; keepAlpha: boolean }
): Promise<string> {
  const img = await loadImage(src);
  const { aspect, focusX, focusY, zoom, outWidth, keepAlpha } = opts;

  // Largest box of the target aspect that fits, shrunk by zoom.
  let cropW = img.width;
  let cropH = cropW / aspect;
  if (cropH > img.height) {
    cropH = img.height;
    cropW = cropH * aspect;
  }
  cropW /= zoom;
  cropH /= zoom;

  // Anchor: 0% = left/top edge, 100% = right/bottom edge (same as CSS object-position).
  const sx = (img.width - cropW) * (focusX / 100);
  const sy = (img.height - cropH) * (focusY / 100);

  const outW = Math.min(outWidth, Math.round(cropW));
  const outH = Math.round(outW / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that image");
  if (!keepAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
  }
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
  return keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
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
