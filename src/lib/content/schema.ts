// The contract for content/benches/*.md frontmatter and content/trash-cans.json.
// Everything in content/ is treated as untrusted input and must pass these schemas.
import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const photoFile = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|avif)$/, "lowercase file name like img_1234.jpg");
const shortText = z.string().trim().min(3).max(140);

export const PHOTO_ROLES = ["panorama", "view", "bench", "around"] as const;

export const photoSchema = z
  .object({
    file: photoFile,
    /** panorama: the 360-ish sweep. view: what you see sitting down. bench: the bench itself. around: anything else nearby. */
    role: z.enum(PHOTO_ROLES),
    alt: z.string().trim().min(15, "describe the photo in a full sentence").max(250),
    caption: z.string().trim().max(200).optional(),
    /** Photo credit, required only if someone else took the picture. */
    credit: z.string().trim().max(120).optional(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?$/).optional(),
    /** Compass direction the camera pointed, 0–360 degrees from north. */
    heading: z.number().min(0).max(360).optional(),
    /**
     * Panorama only: where the view from the seat is, as fractions of the panorama's width
     * (center 0 = left edge, 1 = right edge). Filled in by `npm run locate-views`.
     */
    seatView: z
      .object({ center: z.number().min(0).max(1), width: z.number().gt(0).max(1) })
      .strict()
      .optional(),
  })
  .strict();

export const featuresSchema = z
  .object({
    waterView: z.boolean(),
    facesRoad: z.boolean(),
    roadNearby: z.boolean(),
    shade: z.enum(["none", "partial", "full"]),
    trashCan: z.boolean(),
  })
  .strict();

export const benchFrontmatterSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    summary: z.string().trim().min(20).max(220),
    status: z.enum(["draft", "published"]),
    addedAt: isoDate,
    updatedAt: isoDate.optional(),
    author: z.string().trim().min(2).max(80).optional(),
    location: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .strict(),
    /** Overrides the facing direction taken from the "view" photo's compass heading. */
    facing: z.number().min(0).max(360).optional(),
    features: featuresSchema,
    extraPros: z.array(shortText).max(8).default([]),
    extraCons: z.array(shortText).max(8).default([]),
    photos: z.array(photoSchema).min(1).max(24),
    seo: z
      .object({
        title: z.string().trim().min(10).max(70).optional(),
        description: z.string().trim().min(50).max(160).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((bench, ctx) => {
    const roles = bench.photos.map((p) => p.role);
    if (roles.filter((r) => r === "panorama").length > 1)
      ctx.addIssue({ code: "custom", path: ["photos"], message: "only one photo can be the panorama" });
    if (roles.filter((r) => r === "view").length > 1)
      ctx.addIssue({ code: "custom", path: ["photos"], message: "only one photo can be the view" });
    const files = bench.photos.map((p) => p.file);
    if (new Set(files).size !== files.length)
      ctx.addIssue({ code: "custom", path: ["photos"], message: "the same photo file is listed twice" });
    if (bench.updatedAt && bench.updatedAt < bench.addedAt)
      ctx.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt is before addedAt" });

    if (bench.status === "published") {
      if (!roles.includes("view"))
        ctx.addIssue({ code: "custom", path: ["photos"], message: "a published bench needs a photo with role: view" });
      if (JSON.stringify(bench).includes("TODO"))
        ctx.addIssue({ code: "custom", path: [], message: "a published bench still contains TODO text" });
    }
  });

export type BenchFrontmatter = z.infer<typeof benchFrontmatterSchema>;
export type BenchPhoto = z.infer<typeof photoSchema>;
export type BenchFeatures = z.infer<typeof featuresSchema>;

export const trashSpotSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    photo: photoFile.optional(),
    note: z.string().trim().max(140).optional(),
    /** A dog-waste station: bag dispenser next to the can. */
    dogBags: z.boolean().optional(),
    addedAt: isoDate,
  })
  .strict();

/** A spot with no bench yet where one would be nice (content/bench-wishes.json). */
export const benchWishSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    note: z.string().trim().min(10).max(160),
    photo: photoFile.optional(),
    addedAt: isoDate,
  })
  .strict();

export const benchWishesSchema = z.array(benchWishSchema).max(200);
export type BenchWish = z.infer<typeof benchWishSchema>;

export const trashSpotsSchema = z.array(trashSpotSchema).superRefine((spots, ctx) => {
  const ids = spots.map((s) => s.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "duplicate trash spot id" });
});

export type TrashSpot = z.infer<typeof trashSpotSchema>;
