import { describe, expect, it } from "vitest";
import { loadContent } from "../../src/lib/content/load";
import { homePicks } from "../../src/lib/content/picks";

describe("homePicks", () => {
  const benches = loadContent().benches.filter((b) => b.status === "published");
  const picks = homePicks(benches);

  it("picks distinct benches", () => {
    expect(picks.length).toBeGreaterThan(0);
    expect(new Set(picks.map((p) => p.bench.slug)).size).toBe(picks.length);
  });

  it("only makes claims the data supports", () => {
    for (const { label, bench, reason } of picks) {
      if (label === "Best view") {
        expect(bench.features.waterView).toBe(true);
        expect(bench.features.facesRoad).toBe(false);
        if (reason.includes("no road")) expect(bench.features.roadNearby).toBe(false);
      }
      if (label === "Coolest on a hot day") {
        expect(bench.features.shade).toBe("full");
        if (reason.includes("trash can")) expect(bench.features.trashCan).toBe(true);
      }
      if (label === "Watch the sunset") {
        expect(bench.tags).toContain("sunsets");
        expect(bench.sun?.kind).toBe("sunset");
      }
    }
  });

  it("returns nothing for no benches", () => {
    expect(homePicks([])).toEqual([]);
  });
});
