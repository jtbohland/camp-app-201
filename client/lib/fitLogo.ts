/**
 * Turns any logo image into a square badge-ready image.
 * The whole logo is scaled down and centered inside the circle-safe area on a white
 * background, so it shows in full (never cropped) on every round or square badge.
 * Falls back to the original if the image can't be processed.
 */
const SIZE = 512;
// The largest square that fits inside a circle is ~70.7% of its diameter.
const SAFE_AREA = 0.7;

export function fitLogo(dataUri: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUri.startsWith("data:image/")) {
      resolve(dataUri);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx || !img.width || !img.height) return resolve(dataUri);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SIZE, SIZE);
        const box = SIZE * SAFE_AREA;
        const scale = Math.min(box / img.width, box / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(dataUri);
      }
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}
