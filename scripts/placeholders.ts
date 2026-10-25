/**
 * Builds tiny blurred previews for every bench photo (shown while the real photo loads).
 *   npm run placeholders
 * Writes content/placeholders.json: { "<slug>/<file>": "data:image/webp;base64,..." }.
 * Run after adding or replacing photos (ingest runs it for you).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadContent } from "../src/lib/content/load.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "content", "placeholders.json");

export async function buildPlaceholders(): Promise<number> {
  const { benches } = loadContent();
  let existing: Record<string, string> = {};
  try {
    existing = JSON.parse((await readFile(OUT, "utf8")).replace(/^﻿/, ""));
  } catch {
    // First run.
  }
  const next: Record<string, string> = {};
  for (const bench of benches) {
    for (const photo of bench.photos) {
      const key = `${bench.slug}/${photo.file}`;
      if (existing[key]) {
        next[key] = existing[key];
        continue;
      }
      // ~16px tall keeps each preview around 100–300 bytes; panoramas stay wide.
      const buf = await sharp(path.join(ROOT, "public", "photos", bench.slug, photo.file))
        .resize({ height: 16 })
        .webp({ quality: 40 })
        .toBuffer();
      next[key] = `data:image/webp;base64,${buf.toString("base64")}`;
    }
  }
  await writeFile(OUT, JSON.stringify(next, null, 1) + "\n", "utf8");
  return Object.keys(next).length;
}

if (import.meta.main) {
  console.log(`Wrote ${await buildPlaceholders()} placeholder(s) to content/placeholders.json`);
}
