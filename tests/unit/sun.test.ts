import { describe, expect, it } from "vitest";
import { angleBetween, describeMonths, monthsInView, sunNote, sunriseAzimuth, sunsetAzimuth, sunSummary } from "../../src/lib/sun";

const FISHHAWK = 27.85;

describe("sun positions at FishHawk", () => {
  it("rises and sets in the expected compass ranges", () => {
    // Solstice extremes at 27.85°N are about 63° and 117° for sunrise.
    expect(sunriseAzimuth(5, FISHHAWK)).toBeGreaterThan(62);
    expect(sunriseAzimuth(5, FISHHAWK)).toBeLessThan(66);
    expect(sunriseAzimuth(11, FISHHAWK)).toBeGreaterThan(114);
    expect(sunriseAzimuth(11, FISHHAWK)).toBeLessThan(118);
    // Around the equinoxes the sun sets almost due west.
    expect(Math.abs(sunsetAzimuth(2, FISHHAWK) - 270)).toBeLessThan(5);
    expect(sunsetAzimuth(5, FISHHAWK)).toBeGreaterThan(294);
  });

  it("measures angles across north", () => {
    expect(angleBetween(350, 10)).toBe(20);
    expect(angleBetween(90, 270)).toBe(180);
  });
});

describe("monthsInView", () => {
  it("a west-facing seat sees sunsets all year", () => {
    expect(monthsInView("sunset", 270, FISHHAWK)).toHaveLength(12);
  });

  it("a northwest-facing seat sees only summer sunsets", () => {
    const months = monthsInView("sunset", 317, FISHHAWK);
    expect(months.length).toBeGreaterThan(0);
    expect(months.every((m) => m >= 3 && m <= 8)).toBe(true);
  });

  it("a southeast-facing seat sees winter sunrises", () => {
    const months = monthsInView("sunrise", 149, FISHHAWK);
    expect(months).toContain(11);
    expect(months).not.toContain(5);
  });
});

describe("describeMonths", () => {
  it("phrases runs, single months, and runs across the new year", () => {
    expect(describeMonths([4, 5, 6])).toBe("May to July");
    expect(describeMonths([5])).toBe("June");
    expect(describeMonths([10, 11, 0, 1])).toBe("November to February");
    expect(describeMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe("all year");
    expect(describeMonths([])).toBe("");
  });
});

describe("sunNote", () => {
  it("classifies seats", () => {
    expect(sunNote(270, FISHHAWK).kind).toBe("sunset");
    expect(sunNote(90, FISHHAWK).kind).toBe("sunrise");
    expect(sunNote(0, FISHHAWK).kind).toBe("behind");
    expect(sunNote(180, FISHHAWK).kind).toBe("midday");
    expect(sunSummary(sunNote(270, FISHHAWK))).toBe("Sets in front of you, all year");
  });
});
