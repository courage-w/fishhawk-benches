/**
 * Marks where the "view from the seat" is inside each bench's panorama.
 *
 *   npm run locate-views              # benches that don't have seatView yet
 *   npm run locate-views -- --all     # recompute every bench
 *   npm run locate-views -- --preview # also write marked-up JPEGs to .seat-view-preview/ for checking
 *
 * Writes `seatView: { center, width }` (fractions of the panorama width) onto the panorama photo.
 * Low-confidence matches are reported and left alone; set seatView by hand for those.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { isMap, isSeq, parseDocument, type YAMLMap } from "yaml";
import { locateSeatView } from "./lib/locate-view.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const BENCH_DIR = path.join(ROOT, "content", "benches");
const MIN_SCORE = 0.45;

const { values: args } = parseArgs({
  options: { all: { type: "boolean", default: false }, preview: { type: "boolean", default: false } },
});

async function preview(slug: string, panoFile: string, center: number, width: number) {
  const meta = await sharp(panoFile).metadata();
  const W = 1600;
  const H = Math.round((meta.height! / meta.width!) * W);
  const left = Math.round((center - width / 2) * W);
  const right = Math.round((center + width / 2) * W);
  const svg = Buffer.from(
    `<svg width="${W}" height="${H}"><rect x="${left}" y="0" width="${right - left}" height="${H}" fill="none" stroke="#ff2" stroke-width="4"/></svg>`,
  );
  const out = path.join(ROOT, ".seat-view-preview");
  await mkdir(out, { recursive: true });
  await sharp(panoFile).resize({ width: W }).composite([{ input: svg }]).jpeg().toFile(path.join(out, `${slug}.jpg`));
}

export async function locateForBench(slug: string, opts: { force: boolean; preview: boolean }) {
  const file = path.join(BENCH_DIR, `${slug}.md`);
  const raw = await readFile(file, "utf8");
  const match = /^(﻿?---\r?\n)([\s\S]*?)(\r?\n---\r?\n?[\s\S]*)$/.exec(raw);
  if (!match) return `${slug}: no frontmatter, skipped`;
  const doc = parseDocument(match[2]);
  const photos = doc.get("photos");
  if (!isSeq(photos)) return `${slug}: no photos, skipped`;
  const items = photos.items.filter(isMap) as YAMLMap[];
  const pano = items.find((p) => p.get("role") === "panorama");
  const view = items.find((p) => p.get("role") === "view");
  if (!pano || !view) return `${slug}: needs both a panorama and a view photo, skipped`;
  if (pano.get("seatView") && !opts.force) return `${slug}: already has seatView`;

  const dir = path.join(ROOT, "public", "photos", slug);
  const panoFile = path.join(dir, String(pano.get("file")));
  const found = await locateSeatView(panoFile, path.join(dir, String(view.get("file"))));
  if (!found || found.score < MIN_SCORE) {
    return `${slug}: not confident (score ${found?.score ?? "n/a"}); set seatView by hand`;
  }
  pano.set("seatView", { center: found.center, width: found.width });
  await writeFile(file, match[1] + doc.toString().trimEnd() + match[3], "utf8");
  if (opts.preview) await preview(slug, panoFile, found.center, found.width);
  return `${slug}: center ${found.center}, width ${found.width} (score ${found.score})`;
}

if (import.meta.main) {
  const slugs = (await readdir(BENCH_DIR)).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  for (const slug of slugs) console.log(await locateForBench(slug, { force: args.all!, preview: args.preview! }));
  if (args.preview) console.log("Previews (yellow box = seat view) in .seat-view-preview/");
}
