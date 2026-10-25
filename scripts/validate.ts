/**
 * Checks every bench and trash spot before publishing.
 *   npm run validate
 * Exits non-zero on errors. Warnings (drafts, missing panorama, odd photo sizes) don't fail.
 */
import path from "node:path";
import sharp from "sharp";
import { loadContent, placeholderFor } from "../src/lib/content/load.ts";
import { distanceMeters } from "../src/lib/geo.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const { benches, trash, errors } = loadContent();
const warnings: string[] = [];

for (const bench of benches) {
  const where = `content/benches/${bench.slug}.md`;
  if (bench.status === "draft") warnings.push(`${where}: still a draft (won't appear on the site)`);
  if (!bench.panorama) warnings.push(`${where}: no panorama photo`);
  else if (!bench.panorama.seatView && bench.view)
    warnings.push(`${where}: panorama has no seat-view lines yet (run \`npm run locate-views\`)`);
  if (bench.facingDegrees === null) warnings.push(`${where}: facing direction unknown (no heading on the view photo)`);
  if (/!\[|<[a-z]/i.test(bench.body)) errors.push(`${where}: body must not contain images or HTML; use the photos list`);

  for (const photo of bench.photos) {
    if (!placeholderFor(bench.slug, photo.file))
      warnings.push(`${where}: ${photo.file} has no loading preview (run \`npm run placeholders\`)`);
    const file = path.join(ROOT, "public", "photos", bench.slug, photo.file);
    try {
      const meta = await sharp(file).metadata();
      if (meta.width !== photo.width || meta.height !== photo.height) {
        errors.push(
          `${where}: ${photo.file} is ${meta.width}x${meta.height} but the file says ${photo.width}x${photo.height}`,
        );
      }
      if (meta.exif || meta.xmp) errors.push(`${where}: ${photo.file} still has EXIF/XMP metadata (may include GPS)`);
    } catch {
      // Missing files are already reported by loadContent().
    }
  }

  for (const other of benches) {
    if (other.slug < bench.slug && distanceMeters(other.location, bench.location) < 10) {
      warnings.push(`${where}: within 10 m of ${other.slug}; is it the same bench?`);
    }
  }
}

for (const spot of trash) {
  if (!spot.photo) continue;
  const meta = await sharp(path.join(ROOT, "public", "photos", "trash", spot.photo))
    .metadata()
    .catch(() => null);
  if (meta?.exif || meta?.xmp) errors.push(`content/trash-cans.json ${spot.id}: photo still has EXIF/XMP metadata`);
}

const published = benches.filter((b) => b.status === "published").length;
console.log(`${published} published bench(es), ${benches.length - published} draft(s), ${trash.length} trash spot(s).`);
for (const w of warnings) console.log(`  warning: ${w}`);
for (const e of errors) console.error(`  error:   ${e}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s) to fix before publishing.`);
  process.exit(1);
}
console.log("Content looks good.");
