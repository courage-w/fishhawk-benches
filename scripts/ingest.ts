/**
 * Turn phone photos into draft bench entries (or trash-can map spots).
 *
 *   npm run ingest                       # benches from ./photos-inbox
 *   npm run ingest -- --trash            # every photo becomes a trash-can spot
 *   npm run ingest -- --trash --dog-bags # ...marked as a dog bag station (bags + can)
 *   npm run ingest -- --dry-run          # show the grouping, write nothing
 *   npm run ingest -- --inbox ../pics    # read photos from another folder
 *
 * Photos are grouped by time + GPS (see src/lib/cluster.ts). Each group becomes
 * content/benches/<slug>.md with status: draft. Web copies are written to
 * public/photos/<slug>/ with ALL metadata (including GPS) stripped.
 */
import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import exifr from "exifr";
import heicConvert from "heic-convert";
import sharp from "sharp";
import { stringify } from "yaml";
import { centroid, distanceMeters } from "../src/lib/geo.ts";
import { clusterPhotos, exifDateToIso, isPanoramaSize, type PhotoPoint } from "../src/lib/cluster.ts";
import { buildPlaceholders } from "./placeholders.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const BENCH_DIR = path.join(ROOT, "content", "benches");
const TRASH_FILE = path.join(ROOT, "content", "trash-cans.json");
const PHOTO_DIR = path.join(ROOT, "public", "photos");
const SUPPORTED = new Set([".heic", ".heif", ".jpg", ".jpeg", ".png"]);

const { values: args } = parseArgs({
  options: {
    inbox: { type: "string", default: "photos-inbox" },
    trash: { type: "boolean", default: false },
    "dog-bags": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

// exifr 7.1.3 rejects HEIC files whose `ftyp` box is longer than 50 bytes, which
// recent iPhones produce (52 bytes). Re-register its detector without that limit.
type BufferView = { getUint16(offset: number): number; getString(offset: number, length: number): string };
const heicParser = (
  exifr as unknown as { fileParsers: Map<string, { canHandle(file: BufferView, offset: number): boolean }> }
).fileParsers.get("heic");
if (heicParser) {
  heicParser.canHandle = (file, offset) => {
    if (offset !== 0) return false;
    const ftypLength = file.getUint16(2);
    if (ftypLength > 1024) return false;
    for (let n = 8; n < ftypLength; n += 4) if (file.getString(n, 4) === "heic") return true;
    return false;
  };
}

type Scanned = PhotoPoint & {
  source: string;
  /** Photographer's wall-clock time, e.g. 2026-10-25T14:43:23-04:00 */
  takenAtLocal: string;
  heading: number | null;
  width: number;
  height: number;
};

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Decode HEIC (sharp's prebuilt libvips can't) and return an auto-oriented sharp pipeline. */
async function openImage(file: string) {
  const input = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  const decoded =
    ext === ".heic" || ext === ".heif"
      ? Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.95 }))
      : input;
  return sharp(decoded, { limitInputPixels: 120_000_000 }).rotate();
}

async function scan(dir: string): Promise<Scanned[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && SUPPORTED.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name));

  const out: Scanned[] = [];
  for (const file of files) {
    const buffer = await readFile(file);
    const meta = await exifr.parse(buffer, { gps: true, exif: true, tiff: true });
    const name = path.basename(file);
    if (!meta?.latitude || !meta?.longitude) {
      console.warn(`  skip ${name}: no GPS location in the photo`);
      continue;
    }
    // exifr turns EXIF wall-clock time into a Date as if it were UTC, so read the raw strings.
    const raw = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "OffsetTime"],
      reviveValues: false,
    });
    const takenAtLocal = exifDateToIso(
      String(raw?.DateTimeOriginal ?? raw?.CreateDate ?? ""),
      raw?.OffsetTimeOriginal ?? raw?.OffsetTime,
    );
    if (!takenAtLocal) {
      console.warn(`  skip ${name}: no capture time in the photo`);
      continue;
    }
    const takenAt = new Date(takenAtLocal);
    // Width/height as displayed (EXIF orientation 5â€“8 swaps them).
    const rawW = meta.ExifImageWidth ?? meta.ImageWidth ?? 0;
    const rawH = meta.ExifImageHeight ?? meta.ImageHeight ?? 0;
    const swapped = [5, 6, 7, 8].includes(meta.Orientation);
    const width = swapped ? rawH : rawW;
    const height = swapped ? rawW : rawH;
    out.push({
      file: name,
      source: file,
      lat: meta.latitude,
      lng: meta.longitude,
      takenAt,
      takenAtLocal,
      heading: typeof meta.GPSImgDirection === "number" ? meta.GPSImgDirection : null,
      width,
      height,
      isPanorama: width > 0 && height > 0 && isPanoramaSize(width, height),
    });
  }
  return out;
}

/** Writes a metadata-free web JPEG and returns its final pixel size. */
async function writeWebPhoto(source: string, destDir: string, isPanorama: boolean) {
  await mkdir(destDir, { recursive: true });
  const outName = path.basename(source).replace(/\.[^.]+$/, "").toLowerCase() + ".jpg";
  const dest = path.join(destDir, outName);
  const image = await openImage(source);
  const resized = isPanorama
    ? image.resize({ width: 5600, withoutEnlargement: true })
    : image.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  // sharp drops EXIF/XMP/GPS unless .withMetadata()/.keepMetadata() is called â€” never call them.
  const info = await resized.jpeg({ quality: 80, mozjpeg: true }).toFile(dest);
  return { file: outName, width: info.width, height: info.height };
}

// Both read the wall-clock part of takenAtLocal ("YYYY-MM-DDTHH:MM:SSâ€¦").
const localStamp = (iso: string) => `${iso.slice(0, 10).replaceAll("-", "")}-${iso.slice(11, 13)}${iso.slice(14, 16)}`;
const localDate = (iso: string) => iso.slice(0, 10);
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

async function ingestBenches(photos: Scanned[], dryRun: boolean) {
  const groups = clusterPhotos(photos);
  console.log(`\nFound ${groups.length} bench group(s):`);
  for (const group of groups) {
    const first = group[0];
    // Two benches photographed in the same minute get -b, -c… instead of colliding.
    const base = `bench-${localStamp(first.takenAtLocal)}`;
    const firstWeb = path.basename(first.file).replace(/\.[^.]+$/, "").toLowerCase() + ".jpg";
    let slug = base;
    let alreadyImported = false;
    for (let n = 1; await exists(path.join(BENCH_DIR, `${slug}.md`)); n++) {
      if ((await readFile(path.join(BENCH_DIR, `${slug}.md`), "utf8")).includes(`file: ${firstWeb}`)) {
        alreadyImported = true;
        break;
      }
      slug = `${base}-${String.fromCharCode(97 + n)}`;
    }
    const files = group.map((p) => `${p.file}${p.isPanorama ? " (panorama)" : ""}`).join(", ");
    console.log(`  ${slug}: ${files}`);
    if (alreadyImported) {
      console.log(`    already imported, skipped (content/benches/${slug}.md)`);
      continue;
    }
    if (dryRun) continue;

    const mdPath = path.join(BENCH_DIR, `${slug}.md`);

    // Guess: the first non-panorama shot is the view from the bench. Fix in the draft if not.
    const viewIndex = group.findIndex((p) => !p.isPanorama);
    const photosOut = [];
    for (const [i, p] of group.entries()) {
      const web = await writeWebPhoto(p.source, path.join(PHOTO_DIR, slug), p.isPanorama);
      photosOut.push({
        file: web.file,
        role: p.isPanorama ? "panorama" : i === viewIndex ? "view" : "bench",
        alt: "TODO: describe what this photo shows",
        width: web.width,
        height: web.height,
        takenAt: p.takenAtLocal,
        ...(p.heading === null ? {} : { heading: Math.round(p.heading) }),
      });
    }

    const where = centroid(group);
    const frontmatter = {
      title: `Untitled bench (${localDate(first.takenAtLocal)})`,
      summary: "TODO: one or two calm sentences about this bench.",
      status: "draft",
      addedAt: localDate(first.takenAtLocal),
      location: { lat: round6(where.lat), lng: round6(where.lng) },
      features: {
        waterView: false,
        facesRoad: false,
        roadNearby: false,
        shade: "partial",
        trashCan: false,
      },
      extraPros: [],
      extraCons: [],
      photos: photosOut,
    };
    const body =
      "TODO: a few sentences about sitting here. What do you see, hear, and notice?\n";
    await mkdir(BENCH_DIR, { recursive: true });
    await writeFile(mdPath, `---\n${stringify(frontmatter)}---\n\n${body}`, "utf8");
    console.log(`    wrote ${path.relative(ROOT, mdPath)}`);
  }
}

type TrashSpot = { id: string; lat: number; lng: number; photo?: string; dogBags?: boolean; addedAt: string };

async function ingestTrash(photos: Scanned[], dryRun: boolean) {
  const existing: TrashSpot[] = (await exists(TRASH_FILE))
    ? JSON.parse(await readFile(TRASH_FILE, "utf8"))
    : [];
  const added: TrashSpot[] = [];
  for (const p of photos.sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime())) {
    const near = [...existing, ...added].find((s) => distanceMeters(s, p) < 8);
    if (near) {
      console.log(`  ${p.file}: within 8 m of trash spot ${near.id}, skipped`);
      continue;
    }
    const id = `trash-${localStamp(p.takenAtLocal)}-${path.parse(p.file).name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    console.log(`  ${p.file} -> ${id}`);
    if (dryRun) continue;
    const web = await writeWebPhoto(p.source, path.join(PHOTO_DIR, "trash"), false);
    added.push({
      id,
      lat: round6(p.lat),
      lng: round6(p.lng),
      photo: web.file,
      ...(args["dog-bags"] ? { dogBags: true } : {}),
      addedAt: localDate(p.takenAtLocal),
    });
  }
  if (!dryRun && added.length > 0) {
    await writeFile(TRASH_FILE, JSON.stringify([...existing, ...added], null, 2) + "\n", "utf8");
    console.log(`Added ${added.length} trash spot(s) to content/trash-cans.json`);
  }
}

async function main() {
  const inbox = path.resolve(ROOT, args.inbox!);
  if (!(await exists(inbox))) {
    console.error(`Inbox folder not found: ${inbox}\nCreate it and drop your photos in.`);
    process.exit(1);
  }
  console.log(`Reading photos from ${inbox}`);
  const photos = await scan(inbox);
  if (photos.length === 0) {
    console.log("No usable photos found (they need GPS and a capture time).");
    return;
  }
  if (args.trash) await ingestTrash(photos, args["dry-run"]!);
  else await ingestBenches(photos, args["dry-run"]!);
  if (!args["dry-run"]) {
    if (!args.trash) await buildPlaceholders();
    console.log(
      "\nNext: open the new draft(s), fill in the TODOs, set status: published, then run `npm run validate`." +
        "\nIf you rename a draft, run `npm run placeholders` again.",
    );
  }
}

await main();
