// Pure parsing for bench files: no fs, so it can be unit-tested and reused by scripts.
import { parse as parseYaml } from "yaml";
import { compassPoint, type CompassPoint } from "../geo.ts";
import { benchFrontmatterSchema, SLUG_PATTERN, type BenchFrontmatter, type BenchPhoto } from "./schema.ts";
import { prosAndCons, tagsFor, type TagSlug } from "./traits.ts";

export type Bench = BenchFrontmatter & {
  slug: string;
  body: string;
  pros: string[];
  cons: string[];
  tags: TagSlug[];
  /** Degrees from north the seat faces, if known. */
  facingDegrees: number | null;
  facingPoint: CompassPoint | null;
  panorama: BenchPhoto | null;
  view: BenchPhoto | null;
  /** Photos of the bench and its surroundings, in file order. */
  others: BenchPhoto[];
};

export type ParseResult = { ok: true; bench: Bench } | { ok: false; errors: string[] };

const FRONTMATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseBenchSource(slug: string, source: string): ParseResult {
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) {
    return { ok: false, errors: [`file name "${slug}" must be lowercase words joined by hyphens`] };
  }
  const match = FRONTMATTER.exec(source);
  if (!match) return { ok: false, errors: ["missing --- frontmatter block at the top of the file"] };

  let data: unknown;
  try {
    // Core schema: no custom tags, no timestamps-as-Dates; alias cap guards against "billion laughs".
    data = parseYaml(match[1], { schema: "core", maxAliasCount: 20, uniqueKeys: true });
  } catch (error) {
    return { ok: false, errors: [`frontmatter is not valid YAML: ${(error as Error).message}`] };
  }

  const result = benchFrontmatterSchema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join(".") || "(file)"}: ${i.message}`),
    };
  }

  const fm = result.data;
  const body = match[2].trim();
  if (fm.status === "published" && body.includes("TODO")) {
    return { ok: false, errors: ["body: a published bench still contains TODO text"] };
  }

  const view = fm.photos.find((p) => p.role === "view") ?? null;
  const facingDegrees = fm.facing ?? view?.heading ?? null;
  const { pros, cons } = prosAndCons(fm.features, fm);

  return {
    ok: true,
    bench: {
      ...fm,
      slug,
      body,
      pros,
      cons,
      tags: tagsFor(fm.features),
      facingDegrees,
      facingPoint: facingDegrees === null ? null : compassPoint(facingDegrees),
      panorama: fm.photos.find((p) => p.role === "panorama") ?? null,
      view,
      others: fm.photos.filter((p) => p.role === "bench" || p.role === "around"),
    },
  };
}

export const photoSrc = (slug: string, photo: Pick<BenchPhoto, "file">) => `/photos/${slug}/${photo.file}`;
