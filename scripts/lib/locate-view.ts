// Finds where the "view from the seat" photo sits inside the panorama, by sliding a small
// grayscale copy of the view photo across a small copy of the panorama at several scales and
// keeping the best normalized cross-correlation (NCC) score.
import sharp from "sharp";

export type SeatView = { center: number; width: number; score: number };

const PANO_HEIGHT = 96;

async function gray(file: string, height: number) {
  const { data, info } = await sharp(file)
    .greyscale()
    .resize({ height: Math.max(8, Math.round(height)) })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { px: Float64Array.from(data), w: info.width, h: info.height };
}

export async function locateSeatView(panoramaFile: string, viewFile: string): Promise<SeatView | null> {
  const pano = await gray(panoramaFile, PANO_HEIGHT);
  const W = pano.w;
  const H = pano.h;

  // Integral images of the panorama for fast window mean/variance.
  const S = new Float64Array((W + 1) * (H + 1));
  const S2 = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    let row2 = 0;
    for (let x = 0; x < W; x++) {
      const v = pano.px[y * W + x];
      row += v;
      row2 += v * v;
      S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row;
      S2[(y + 1) * (W + 1) + x + 1] = S2[y * (W + 1) + x + 1] + row2;
    }
  }
  const box = (I: Float64Array, x: number, y: number, w: number, h: number) =>
    I[(y + h) * (W + 1) + x + w] - I[y * (W + 1) + x + w] - I[(y + h) * (W + 1) + x] + I[y * (W + 1) + x];

  let best: SeatView | null = null;
  // The view photo covers 50–95% of the panorama's height depending on lens and tilt.
  for (let scale = 0.5; scale <= 0.951; scale += 0.05) {
    const t = await gray(viewFile, H * scale);
    if (t.w >= W || t.h > H) continue;
    const n = t.w * t.h;
    let tMean = 0;
    for (const v of t.px) tMean += v;
    tMean /= n;
    let tVar = 0;
    const tz = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      tz[i] = t.px[i] - tMean;
      tVar += tz[i] * tz[i];
    }
    if (tVar === 0) continue;

    for (let y = 0; y <= H - t.h; y += 2) {
      for (let x = 0; x <= W - t.w; x++) {
        const sum = box(S, x, y, t.w, t.h);
        const sum2 = box(S2, x, y, t.w, t.h);
        const wVar = sum2 - (sum * sum) / n;
        if (wVar <= 0) continue;
        let cross = 0;
        for (let ty = 0; ty < t.h; ty++) {
          const prow = (y + ty) * W + x;
          const trow = ty * t.w;
          for (let tx = 0; tx < t.w; tx++) cross += tz[trow + tx] * pano.px[prow + tx];
        }
        const score = cross / Math.sqrt(tVar * wVar);
        if (!best || score > best.score) best = { center: (x + t.w / 2) / W, width: t.w / W, score };
      }
    }
  }
  if (!best) return null;
  return {
    center: Math.round(best.center * 1000) / 1000,
    width: Math.round(best.width * 1000) / 1000,
    score: Math.round(best.score * 100) / 100,
  };
}
