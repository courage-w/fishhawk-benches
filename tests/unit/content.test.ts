import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { loadContent } from "../../src/lib/content/load";
import { parseBenchSource } from "../../src/lib/content/parse";
import { prosAndCons, tagsFor } from "../../src/lib/content/traits";

const base = {
  title: "Test Bench",
  summary: "A bench used in tests, with a view of a pond.",
  status: "published",
  addedAt: "2026-10-25",
  location: { lat: 27.85, lng: -82.21 },
  features: { waterView: true, facesRoad: false, roadNearby: false, shade: "partial", trashCan: true },
  photos: [
    { file: "view.jpg", role: "view", alt: "A calm pond seen from the bench.", width: 2000, height: 1500, heading: 317 },
    { file: "pano.jpg", role: "panorama", alt: "A panorama around the bench and pond.", width: 5600, height: 1300 },
  ],
};

const source = (data: object, body = "Some notes.") => `---\n${stringify(data)}---\n\n${body}\n`;
const errorsOf = (r: ReturnType<typeof parseBenchSource>) => (r.ok ? [] : r.errors);

describe("parseBenchSource", () => {
  it("parses a valid bench and derives facing, roles, pros and cons", () => {
    const r = parseBenchSource("test-bench", source(base));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bench.facingPoint).toBe("northwest");
    expect(r.bench.view?.file).toBe("view.jpg");
    expect(r.bench.panorama?.file).toBe("pano.jpg");
    expect(r.bench.pros).toContain("Trash can right next to it");
    // Facing 317° at 27.85°N: early-summer sunsets fall in view, and partial shade still sees the sky.
    expect(r.bench.sun).toMatchObject({ kind: "sunset", when: "May to August" });
    expect(r.bench.pros).toContain("Faces the sunset, May to August");
    expect(r.bench.tags).toEqual(["water-view", "trash-can", "away-from-roads", "sunsets"]);
  });

  it("rejects unsafe or malformed slugs", () => {
    for (const slug of ["../etc/passwd", "Bad Slug", "UPPER", "trailing-", "a/b"]) {
      expect(parseBenchSource(slug, source(base)).ok).toBe(false);
    }
  });

  it("requires frontmatter", () => {
    expect(errorsOf(parseBenchSource("x", "just text"))[0]).toMatch(/frontmatter/);
  });

  it("rejects unknown fields so typos are caught", () => {
    expect(errorsOf(parseBenchSource("x", source({ ...base, titel: "typo" }))).join()).toMatch(/titel|Unrecognized/i);
  });

  it("blocks publishing with TODOs left in", () => {
    expect(parseBenchSource("x", source({ ...base, summary: "TODO: write a summary for this one" })).ok).toBe(false);
    expect(parseBenchSource("x", source(base, "TODO: notes")).ok).toBe(false);
    expect(parseBenchSource("x", source({ ...base, status: "draft", summary: "TODO: write a summary later" })).ok).toBe(true);
  });

  it("requires a view photo to publish and allows only one", () => {
    const noView = { ...base, photos: [base.photos[1]] };
    expect(parseBenchSource("x", source(noView)).ok).toBe(false);
    const twoViews = { ...base, photos: [base.photos[0], { ...base.photos[0], file: "b.jpg" }] };
    expect(errorsOf(parseBenchSource("x", source(twoViews))).join()).toMatch(/only one photo can be the view/);
  });

  it("rejects photo names that could escape the photo folder", () => {
    const bad = { ...base, photos: [{ ...base.photos[0], file: "../../secret.jpg" }] };
    expect(parseBenchSource("x", source(bad)).ok).toBe(false);
  });

  it("requires real alt text", () => {
    const bad = { ...base, photos: [{ ...base.photos[0], alt: "bench" }] };
    expect(parseBenchSource("x", source(bad)).ok).toBe(false);
  });

  it("rejects bad dates and update-before-publish", () => {
    expect(parseBenchSource("x", source({ ...base, addedAt: "10/25/2026" })).ok).toBe(false);
    expect(parseBenchSource("x", source({ ...base, updatedAt: "2026-01-01" })).ok).toBe(false);
  });

  it("refuses YAML alias bombs and custom tags", () => {
    const bomb = `---\na: &a [x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]\nd: [*c,*c,*c,*c,*c,*c,*c,*c,*c]\n---\n`;
    expect(parseBenchSource("x", bomb).ok).toBe(false);
  });

  it("treats code-looking YAML tags as plain text, never executing them", () => {
    const tagged = source(base).replace("title: Test Bench", 'title: !!js/function "() => 1"');
    const r = parseBenchSource("x", tagged);
    if (r.ok) expect(typeof r.bench.title).toBe("string");
  });
});

describe("prosAndCons", () => {
  it("applies the published rules", () => {
    const roadside = prosAndCons({ waterView: false, facesRoad: true, roadNearby: true, shade: "full", trashCan: true });
    expect(roadside.pros).toEqual(["Shaded by trees", "Trash can right next to it"]);
    expect(roadside.cons).toEqual(["Faces the road instead of water or woods"]);

    const open = prosAndCons(
      { waterView: true, facesRoad: false, roadNearby: true, shade: "none", trashCan: false },
      { extraCons: ["Houses across the pond"] },
    );
    expect(open.pros).toEqual(["Looks out over the water"]);
    expect(open.cons).toEqual(["A road runs close by", "No shade, so it gets hot at midday", "Houses across the pond"]);
  });

  it("adds sunrise/sunset pros only for benches that can see the sky", () => {
    const sunset = { kind: "sunset" as const, months: [4, 5, 6, 7], when: "May to August" };
    const open = { waterView: true, facesRoad: false, roadNearby: false, shade: "none" as const, trashCan: false };
    expect(prosAndCons(open, {}, sunset).pros).toContain("Faces the sunset, May to August");
    expect(tagsFor(open, sunset)).toContain("sunsets");
    const shady = { ...open, shade: "full" as const };
    expect(prosAndCons(shady, {}, sunset).pros.join()).not.toMatch(/sunset/);
    expect(tagsFor(shady, sunset)).not.toContain("sunsets");
  });

  it("tags quiet benches only when no road is involved", () => {
    expect(tagsFor({ waterView: false, facesRoad: false, roadNearby: true, shade: "none", trashCan: false })).toEqual([]);
  });
});

describe("content folder", () => {
  it("has no validation errors", () => {
    const { benches, trash, errors } = loadContent();
    expect(errors).toEqual([]);
    expect(benches.length).toBeGreaterThan(0);
    expect(trash.length).toBeGreaterThan(0);
  });
});
