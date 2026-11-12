/**
 * Shrinks a photo to a small JPEG data URL before it's saved with the profile.
 * Phone photos are often several MB, and sending that with every Save Profile is what
 * makes saves slow or fail. Falls back to the original file if the browser can't resize it.
 */
export async function resizeImageToDataUrl(file: File, maxSize = 512, quality = 0.85): Promise<string> {
  const original = await readAsDataUrl(file);
  // GIFs may be animated; keep them as-is (the 2MB limit still applies).
  if (file.type === "image/gif") return original;
  try {
    const img = await loadImage(original);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background in JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const resized = canvas.toDataURL("image/jpeg", quality);
    return resized.length < original.length ? resized : original;
  } catch {
    return original;
  }
}

function readAsDataUrl(file: File): Promise<string> {
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
