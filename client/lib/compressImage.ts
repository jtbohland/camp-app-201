/**
 * Shrinks an image data URI so it can be saved with a submission.
 * Keeps the longest side at or under maxSize px and re-encodes as JPEG.
 * Falls back to the original if anything goes wrong.
 */
export function compressImage(dataUri: string, maxSize = 1400, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUri.startsWith("data:image/") || dataUri.startsWith("data:image/svg")) {
      resolve(dataUri);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUri);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out.length < dataUri.length ? out : dataUri);
      } catch {
        resolve(dataUri);
      }
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}
