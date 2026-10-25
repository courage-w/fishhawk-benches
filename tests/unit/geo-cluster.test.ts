import { describe, expect, it } from "vitest";
import { clusterPhotos, exifDateToIso, isPanoramaSize, type PhotoPoint } from "../../src/lib/cluster";
import { bearingDegrees, compassPoint, distanceMeters, formatWalkingDistance } from "../../src/lib/geo";

// Degrees-minutes-seconds helper, matching how the phone stores GPS.
const dms = (d: number, m: number, s: number) => d + m / 60 + s / 3600;
const photo = (file: string, time: string, lat: number[], lng: number[], isPanorama = false): PhotoPoint => ({
  file,
  takenAt: new Date(`2026-10-25T${time}-04:00`),
  lat: dms(lat[0], lat[1], lat[2]),
  lng: -dms(lng[0], lng[1], lng[2]),
  isPanorama,
});

describe("geo", () => {
  it("measures short distances in metres", () => {
    const a = { lat: 27.8524, lng: -82.2076 };
    const b = { lat: 27.8533, lng: -82.2076 }; // ~0.0009° north
    expect(distanceMeters(a, b)).toBeGreaterThan(95);
    expect(distanceMeters(a, b)).toBeLessThan(105);
  });

  it("names compass points", () => {
    expect(compassPoint(0)).toBe("north");
    expect(compassPoint(317)).toBe("northwest");
    expect(compassPoint(359)).toBe("north");
    expect(compassPoint(-90)).toBe("west");
    expect(compassPoint(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }))).toBe("east");
  });

  it("formats walking distances for US readers", () => {
    expect(formatWalkingDistance(30)).toBe("100 ft");
    expect(formatWalkingDistance(1000)).toBe("0.6 mi");
  });
});

describe("clusterPhotos", () => {
  it("keeps a quick shot taken right after the panorama with its bench", () => {
    // Real sequence from the first walk: 2446 is the panorama, 2447 was taken 21 s later at the same spot.
    const groups = clusterPhotos([
      photo("2443", "10:46:00", [27, 51, 5.72], [82, 12, 28.61]),
      photo("2446", "10:46:22", [27, 51, 5.51], [82, 12, 28.75], true),
      photo("2447", "10:46:43", [27, 51, 5.69], [82, 12, 28.69]),
    ]);
    expect(groups.map((g) => g.map((p) => p.file))).toEqual([["2443", "2446", "2447"]]);
  });

  it("splits two benches about 45 m apart photographed a minute apart", () => {
    const groups = clusterPhotos([
      photo("2463", "11:13:56", [27, 50, 51.03], [82, 12, 40.91]),
      photo("2466", "11:14:18", [27, 50, 51.18], [82, 12, 41.16], true),
      photo("2468", "11:15:14", [27, 50, 49.89], [82, 12, 41.93]),
      photo("2471", "11:15:27", [27, 50, 49.61], [82, 12, 41.85], true),
    ]);
    expect(groups.map((g) => g.map((p) => p.file))).toEqual([
      ["2463", "2466"],
      ["2468", "2471"],
    ]);
  });

  it("splits on long time gaps even at the same place", () => {
    const groups = clusterPhotos([
      photo("a", "10:00:00", [27, 51, 0], [82, 12, 0]),
      photo("b", "10:30:00", [27, 51, 0], [82, 12, 0]),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("sorts by time before grouping", () => {
    const groups = clusterPhotos([
      photo("late", "10:01:00", [27, 51, 0], [82, 12, 0]),
      photo("early", "10:00:00", [27, 51, 0], [82, 12, 0]),
    ]);
    expect(groups[0].map((p) => p.file)).toEqual(["early", "late"]);
  });

  it("detects panoramas by shape", () => {
    expect(isPanoramaSize(16290, 3822)).toBe(true);
    expect(isPanoramaSize(5712, 4284)).toBe(false);
    expect(isPanoramaSize(5454, 3828)).toBe(false);
  });
});

describe("exifDateToIso", () => {
  it("keeps the photographer's wall-clock time and offset", () => {
    expect(exifDateToIso("2026:10:25 10:43:23", "-04:00")).toBe("2026-10-25T10:43:23-04:00");
    expect(exifDateToIso("2026:10:25 10:43:23")).toBe("2026-10-25T10:43:23");
  });

  it("rejects junk", () => {
    expect(exifDateToIso("yesterday")).toBeNull();
    expect(exifDateToIso("2026:10:25 10:43:23", "-4h")).toBe("2026-10-25T10:43:23");
  });
});
