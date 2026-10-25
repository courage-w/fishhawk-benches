// "Start here" picks for the home page, chosen by rules from the bench data (no hand-picking),
// so they stay honest and update themselves as benches are added.
import type { Bench } from "./parse.ts";

export type Pick = { label: string; reason: string; bench: Bench };

const score = (b: Bench) => b.pros.length - b.cons.length;
const byScore = (a: Bench, b: Bench) => score(b) - score(a) || a.title.localeCompare(b.title);

export function homePicks(benches: Bench[]): Pick[] {
  const used = new Set<string>();
  const take = (candidates: Bench[]) => candidates.sort(byScore).find((b) => !used.has(b.slug));
  const picks: Pick[] = [];

  const view = take(benches.filter((b) => b.features.waterView && !b.features.facesRoad && b.panorama));
  if (view) {
    used.add(view.slug);
    picks.push({
      label: "Best view",
      reason: view.features.roadNearby ? "Water in front of you." : "Water in front of you and no road in sight.",
      bench: view,
    });
  }

  const shade = take(benches.filter((b) => b.features.shade === "full" && !b.features.facesRoad));
  if (shade) {
    used.add(shade.slug);
    picks.push({
      label: "Coolest on a hot day",
      reason: shade.features.trashCan ? "Full shade, and a trash can beside it." : "Full shade from the trees.",
      bench: shade,
    });
  }

  const sunset = benches
    .filter((b) => b.tags.includes("sunsets") && !used.has(b.slug) && b.sun?.kind === "sunset")
    .sort((a, b) => monthsOf(b) - monthsOf(a) || byScore(a, b))[0];
  if (sunset && sunset.sun?.kind === "sunset") {
    used.add(sunset.slug);
    picks.push({ label: "Watch the sunset", reason: `The sun sets in front of you, ${sunset.sun.when}.`, bench: sunset });
  }

  return picks;
}

const monthsOf = (b: Bench) => (b.sun?.kind === "sunset" ? b.sun.months.length : 0);
