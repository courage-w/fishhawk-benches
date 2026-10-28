// Reads and validates everything under content/. Server-side only (uses fs).
// Any invalid file stops the build with a readable message, so broken content never ships.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { bearingDegrees, compassPoint, distanceMeters, type CompassPoint } from "../geo.ts";
import { parseBenchSource, type Bench } from "./parse.ts";
import { benchWishesSchema, SLUG_PATTERN, trashSpotsSchema, type BenchWish, type TrashSpot } from "./schema.ts";
import type { TagSlug } from "./traits.ts";

const ROOT = process.cwd();
const BENCH_DIR = path.join(ROOT, "content", "benches");
const TRASH_FILE = path.join(ROOT, "content", "trash-cans.json");
const WISH_FILE = path.join(ROOT, "content", "bench-wishes.json");
const PHOTO_DIR = path.join(ROOT, "public", "photos");

export type LoadReport = { benches: Bench[]; trash: TrashSpot[]; wishes: BenchWish[]; errors: string[] };

/** Validates every content file and collects all problems instead of stopping at the first. */
export function loadContent(): LoadReport {
  const errors: string[] = [];
  const benches: Bench[] = [];

  const files = existsSync(BENCH_DIR) ? readdirSync(BENCH_DIR).filter((f) => f.endsWith(".md")) : [];
  for (const file of files) {
    const slug = file.slice(0, -3);
    const result = parseBenchSource(slug, readFileSync(path.join(BENCH_DIR, file), "utf8"));
    if (!result.ok) {
      errors.push(...result.errors.map((e) => `content/benches/${file}: ${e}`));
      continue;
    }
    for (const photo of result.bench.photos) {
      if (!existsSync(path.join(PHOTO_DIR, slug, photo.file))) {
        errors.push(`content/benches/${file}: photo public/photos/${slug}/${photo.file} does not exist`);
      }
    }
    benches.push(result.bench);
  }

  let trash: TrashSpot[] = [];
  if (existsSync(TRASH_FILE)) {
    try {
      // Strip a UTF-8 BOM: some Windows editors add one and JSON.parse rejects it.
      const raw = readFileSync(TRASH_FILE, "utf8").replace(/^﻿/, "");
      const parsed = trashSpotsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) trash = parsed.data;
      else errors.push(...parsed.error.issues.map((i) => `content/trash-cans.json ${i.path.join(".")}: ${i.message}`));
    } catch (error) {
      errors.push(`content/trash-cans.json: not valid JSON (${(error as Error).message})`);
    }
    for (const spot of trash) {
      if (spot.photo && !existsSync(path.join(PHOTO_DIR, "trash", spot.photo))) {
        errors.push(`content/trash-cans.json ${spot.id}: photo public/photos/trash/${spot.photo} does not exist`);
      }
    }
  }

  let wishes: BenchWish[] = [];
  if (existsSync(WISH_FILE)) {
    try {
      const raw = readFileSync(WISH_FILE, "utf8").replace(/^\uFEFF/, "");
      const parsed = benchWishesSchema.safeParse(JSON.parse(raw));
      if (parsed.success) wishes = parsed.data;
      else errors.push(...parsed.error.issues.map((i) => `content/bench-wishes.json ${i.path.join(".")}: ${i.message}`));
    } catch (error) {
      errors.push(`content/bench-wishes.json: not valid JSON (${(error as Error).message})`);
    }
    for (const wish of wishes) {
      if (wish.photo && !existsSync(path.join(PHOTO_DIR, "wishes", wish.photo))) {
        errors.push(`content/bench-wishes.json ${wish.id}: photo public/photos/wishes/${wish.photo} does not exist`);
      }
    }
  }

  benches.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title));
  return { benches, trash, wishes, errors };
}

let cache: LoadReport | null = null;

function content(): LoadReport {
  // Re-read on every call in development so edits show up without a restart.
  if (cache && process.env.NODE_ENV === "production") return cache;
  const report = loadContent();
  if (report.errors.length > 0) {
    throw new Error(`Content problems (run \`npm run validate\`):\n  - ${report.errors.join("\n  - ")}`);
  }
  cache = report;
  return report;
}

/** Drafts are visible only in `next dev` with SHOW_DRAFTS=true; never in production. */
const showDrafts = () => process.env.NODE_ENV !== "production" && process.env.SHOW_DRAFTS === "true";

export function getBenches(): Bench[] {
  return content().benches.filter((b) => b.status === "published" || showDrafts());
}

export function getBench(slug: string): Bench | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  return getBenches().find((b) => b.slug === slug) ?? null;
}

export function getBenchesByTag(tag: TagSlug): Bench[] {
  return getBenches().filter((b) => b.tags.includes(tag));
}

export function getTrashSpots(): TrashSpot[] {
  return content().trash;
}

export function getBenchWishes(): BenchWish[] {
  return content().wishes;
}

let placeholders: Record<string, string> | null = null;

/** Tiny blurred preview for a photo (from `npm run placeholders`), or undefined if missing. */
export function placeholderFor(slug: string, file: string): string | undefined {
  if (!placeholders || process.env.NODE_ENV !== "production") {
    const jsonPath = path.join(ROOT, "content", "placeholders.json");
    try {
      const parsed: unknown = JSON.parse(readFileSync(jsonPath, "utf8").replace(/^﻿/, ""));
      placeholders = {};
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          // Only accept tiny inline images; anything else is ignored rather than rendered.
          if (typeof v === "string" && /^data:image\/webp;base64,[A-Za-z0-9+/=]{1,4000}$/.test(v)) placeholders[k] = v;
        }
      }
    } catch {
      placeholders = {};
    }
  }
  return placeholders[`${slug}/${file}`];
}

export type Neighbor = { bench: Bench; meters: number; direction: CompassPoint };

/** Closest other benches, with the direction to walk from this one. */
export function nearestBenches(from: Bench, count = 3): Neighbor[] {
  return getBenches()
    .filter((b) => b.slug !== from.slug)
    .map((b) => ({
      bench: b,
      meters: distanceMeters(from.location, b.location),
      direction: compassPoint(bearingDegrees(from.location, b.location)),
    }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, count);
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    totalPages,
  };
}
