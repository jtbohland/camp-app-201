/**
 * In-browser background removal for photos of a figure on a plain backdrop (e.g. a LEGO minifig
 * on black). Works best when the backdrop is one even color.
 *
 * How it works:
 *  1. Sample the photo's border to learn the backdrop color.
 *  2. Flood-fill from the edges through pixels close to that color: only backdrop connected to the
 *     edge is removed, so dark pieces *inside* the figure (a black base, hair) survive.
 *  3. Keep only the largest remaining shape (drops specks and stray objects), trim, and feather edges.
 */
export type BackgroundRemovalResult = {
  /** Transparent PNG data URL, trimmed to the figure. */
  dataUrl: string;
  /** Fraction of the photo that was removed (0..1), for a "did it work?" hint. */
  removed: number;
};

const MAX_SIDE = 640;

export async function removeBackground(src: string, strength = 0.5): Promise<BackgroundRemovalResult> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser can't edit images");
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // 1. Backdrop color = median of the border pixels.
  const border: [number, number, number][] = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    border.push([px[i], px[i + 1], px[i + 2]]);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  const median = (k: 0 | 1 | 2) => {
    const v = border.map((b) => b[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const bg = [median(0), median(1), median(2)];

  // Tolerance: how far from the backdrop color still counts as backdrop (strength 0..1).
  const tol = 30 + strength * 90;
  const tol2 = tol * tol;
  const dist2 = (i: number) => {
    const dr = px[i] - bg[0], dg = px[i + 1] - bg[1], db = px[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db;
  };

  // 2. Flood-fill backdrop from every edge pixel.
  const isBg = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const p = y * w + x;
    if (!isBg[p] && dist2(p * 4) <= tol2) { isBg[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  // 3. Keep the largest connected foreground shape.
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, next = 0;
  for (let start = 0; start < w * h; start++) {
    if (isBg[start] || label[start]) continue;
    next++;
    let size = 0;
    const q = [start];
    label[start] = next;
    while (q.length) {
      const p = q.pop()!;
      size++;
      const x = p % w, y = (p / w) | 0;
      const visit = (n: number) => { if (!isBg[n] && !label[n]) { label[n] = next; q.push(n); } };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (y > 0) visit(p - w);
      if (y < h - 1) visit(p + w);
    }
    if (size > bestSize) { bestSize = size; best = next; }
  }
  if (!best) throw new Error("Couldn't find the figure. Try a lower strength or a plainer background.");

  // Alpha mask + bounding box. Pixels next to the backdrop get a soft edge.
  let minX = w, minY = h, maxX = 0, maxY = 0, removedCount = 0;
  for (let p = 0; p < w * h; p++) {
    const keep = label[p] === best;
    const i = p * 4;
    if (!keep) { px[i + 3] = 0; removedCount++; continue; }
    const x = p % w, y = (p / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const edge =
      (x > 0 && label[p - 1] !== best) || (x < w - 1 && label[p + 1] !== best) ||
      (y > 0 && label[p - w] !== best) || (y < h - 1 && label[p + w] !== best);
    if (edge) px[i + 3] = 170;
  }
  ctx.putImageData(image, 0, 0);

  // Trim to the figure with a little breathing room.
  const pad = 6;
  const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad + 1) - cx, ch = Math.min(h, maxY + pad + 1) - cy;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return { dataUrl: out.toDataURL("image/png"), removed: removedCount / (w * h) };
}

/** Shrinks an already-transparent PNG (no background removal), keeping transparency. */
export async function shrinkPng(src: string, maxSide = MAX_SIDE): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
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
