/**
 * Cleans up a group/trophy photo in the browser using classic photo-editing steps only
 * (no AI, nothing is invented or redrawn):
 *  1. Gentle upscale of small photos (smooth resampling, so later sharpening has room to work).
 *  2. Auto levels: stretches washed-out / dull exposure, same curve on every channel so colors stay true.
 *  3. Grain reduction: an edge-aware filter smooths noise in flat areas (skin, walls, sky) but leaves edges alone.
 *  4. Gentle sharpening (unsharp mask with a noise threshold) so faces and text read clearly.
 * Every step is capped so the result looks like a clean photo, not an edited one.
 */

const MAX_SIDE = 1600;
const MIN_TARGET = 1200;

export type EnhanceResult = { dataUrl: string; changed: boolean };

export async function enhancePhoto(src: string): Promise<EnhanceResult> {
  const img = await loadImage(src);

  // 1. Size: shrink big photos, gently upscale small ones (at most 2x).
  const longest = Math.max(img.width, img.height);
  let scale = Math.min(1, MAX_SIDE / longest);
  if (longest < MIN_TARGET) scale = Math.min(2, MIN_TARGET / longest);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const upscaled = scale > 1.05;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { dataUrl: src, changed: false };
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const n = w * h;

  // Luminance plane (used for levels, noise estimate and edge detection).
  const lum = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) lum[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];

  // 2. Auto levels from the 0.5% / 99.5% luminance points, capped so dark or bright scenes keep their mood.
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, lum[i] | 0)]++;
  const lo = Math.min(percentile(hist, n, 0.005), 40);
  const hi = Math.max(percentile(hist, n, 0.995), 215);
  const range = Math.max(1, hi - lo);
  const doLevels = lo > 4 || hi < 251;
  const gain = 255 / range;

  // 3. Noise estimate: median difference between a pixel and its 3x3 neighbourhood.
  const lumBlur = boxBlur(lum, w, h, 1);
  const diffHist = new Uint32Array(64);
  for (let i = 0; i < n; i += 3) diffHist[Math.min(63, Math.abs(lum[i] - lumBlur[i]) | 0)]++;
  const noise = percentile(diffHist, Math.ceil(n / 3), 0.5);
  // Clean photos get almost no smoothing; grainy ones get more, but never a "plastic" look.
  const denoiseStrength = noise <= 1 ? 0 : Math.min(0.75, 0.2 + noise * 0.12);
  const noiseThreshold = Math.max(6, noise * 4); // differences above this are treated as real edges

  // Work per channel in float.
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    for (let c = 0; c < 3; c++) ch[c][i] = doLevels ? (px[p + c] - lo) * gain : px[p + c];
  }

  if (denoiseStrength > 0) {
    for (let c = 0; c < 3; c++) {
      const src = ch[c];
      const blur = boxBlur(src, w, h, 1);
      for (let i = 0; i < n; i++) {
        const d = Math.abs(src[i] - blur[i]);
        const wgt = denoiseStrength * Math.max(0, 1 - d / noiseThreshold);
        src[i] += wgt * (blur[i] - src[i]);
      }
    }
  }

  // 4. Unsharp mask on luminance detail (keeps colors clean), skipping tiny differences (leftover grain).
  const amount = upscaled ? 0.7 : 0.5;
  const sharpThreshold = Math.max(2, noise * 1.5);
  const l2 = new Float32Array(n);
  for (let i = 0; i < n; i++) l2[i] = 0.299 * ch[0][i] + 0.587 * ch[1][i] + 0.114 * ch[2][i];
  const l2Blur = boxBlur(boxBlur(l2, w, h, 1), w, h, 1); // ~gaussian, radius ~1.5px
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const detail = l2[i] - l2Blur[i];
    const boost = Math.abs(detail) > sharpThreshold ? Math.max(-24, Math.min(24, detail * amount)) : 0;
    px[p] = clamp8(ch[0][i] + boost);
    px[p + 1] = clamp8(ch[1][i] + boost);
    px[p + 2] = clamp8(ch[2][i] + boost);
  }

  ctx.putImageData(image, 0, 0);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.9), changed: true };
}

/** Separable box blur (radius r) of a single float plane. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const size = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / size;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / size;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function percentile(hist: Uint32Array, total: number, q: number): number {
  const target = total * q;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return hist.length - 1;
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = src;
  });
}
