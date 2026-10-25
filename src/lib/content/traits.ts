// Turns a bench's features into consistent pros, cons and tags, so every bench
// is judged by the same rules. The About page shows these rules to readers.
import type { SunNote } from "../sun.ts";
import type { BenchFeatures } from "./schema.ts";

export type Tag = {
  slug: string;
  label: string;
  /** Sentence used on the tag archive page. */
  description: string;
};

export const TAGS = {
  "water-view": {
    slug: "water-view",
    label: "Water view",
    description: "Benches where you look out over a pond.",
  },
  shaded: {
    slug: "shaded",
    label: "Shaded",
    description: "Benches with full shade from trees, good for hot afternoons.",
  },
  "trash-can": {
    slug: "trash-can",
    label: "Trash can",
    description: "Benches with a trash can right beside them.",
  },
  "away-from-roads": {
    slug: "away-from-roads",
    label: "Away from roads",
    description: "Benches where the road is out of sight and out of earshot.",
  },
  sunsets: {
    slug: "sunsets",
    label: "Sunsets",
    description: "Open benches where the sun sets in front of you for at least part of the year.",
  },
  sunrises: {
    slug: "sunrises",
    label: "Sunrises",
    description: "Open benches where the sun comes up in front of you for at least part of the year.",
  },
} as const satisfies Record<string, Tag>;

export type TagSlug = keyof typeof TAGS;
export const TAG_SLUGS = Object.keys(TAGS) as TagSlug[];

/** Sunrise/sunset only counts when trees don't block the sky in front of you. */
const seesSky = (f: BenchFeatures) => f.shade !== "full";

export function tagsFor(f: BenchFeatures, sun: SunNote | null = null): TagSlug[] {
  const tags: TagSlug[] = [];
  if (f.waterView) tags.push("water-view");
  if (f.shade === "full") tags.push("shaded");
  if (f.trashCan) tags.push("trash-can");
  if (!f.roadNearby && !f.facesRoad) tags.push("away-from-roads");
  if (sun?.kind === "sunset" && seesSky(f)) tags.push("sunsets");
  if (sun?.kind === "sunrise" && seesSky(f)) tags.push("sunrises");
  return tags;
}

/** The rules, in the order they're applied. Shared with the About page. */
export const RULES: { when: string; pro?: string; con?: string }[] = [
  { when: "You can see water from the seat", pro: "Looks out over the water" },
  { when: "The seat faces a road", con: "Faces the road instead of water or woods" },
  { when: "It doesn't face a road, but one is close by", con: "A road runs close by" },
  { when: "Trees shade it most of the day", pro: "Shaded by trees" },
  { when: "Trees shade it for part of the day", pro: "Some shade from nearby trees" },
  { when: "Nothing shades it", con: "No shade, so it gets hot at midday" },
  { when: "A trash can is right beside it", pro: "Trash can right next to it" },
  { when: "There's no road in sight or earshot", pro: "Quiet and away from traffic" },
  {
    when: "The sun sets within your view for part of the year, and trees don't fully shade the seat",
    pro: "Faces the sunset (with the months it does)",
  },
  {
    when: "The sun rises within your view for part of the year, and trees don't fully shade the seat",
    pro: "Faces the sunrise (with the months it does)",
  },
];

export function prosAndCons(
  f: BenchFeatures,
  extra: { extraPros?: string[]; extraCons?: string[] } = {},
  sun: SunNote | null = null,
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const rule = (i: number) => RULES[i];

  if (f.waterView) pros.push(rule(0).pro!);
  if (f.facesRoad) cons.push(rule(1).con!);
  else if (f.roadNearby) cons.push(rule(2).con!);
  if (f.shade === "full") pros.push(rule(3).pro!);
  if (f.shade === "partial") pros.push(rule(4).pro!);
  if (f.shade === "none") cons.push(rule(5).con!);
  if (f.trashCan) pros.push(rule(6).pro!);
  if (!f.roadNearby && !f.facesRoad) pros.push(rule(7).pro!);
  if (sun?.kind === "sunset" && seesSky(f)) pros.push(`Faces the sunset, ${sun.when}`);
  if (sun?.kind === "sunrise" && seesSky(f)) pros.push(`Faces the sunrise, ${sun.when}`);

  return {
    pros: [...pros, ...(extra.extraPros ?? [])],
    cons: [...cons, ...(extra.extraCons ?? [])],
  };
}

export const SHADE_LABEL: Record<BenchFeatures["shade"], string> = {
  none: "None",
  partial: "Some",
  full: "Full shade",
};
