// Where the sun rises and sets relative to a bench, from its facing direction (true north)
// and latitude. Pure math, no dependencies, unit-tested.
//
// Sunrise azimuth A (degrees from north) satisfies cos A = sin δ / cos φ, where δ is the sun's
// declination and φ the latitude; sunset is 360° − A. Refraction and the local horizon shift this
// by a degree or two, which doesn't matter at month granularity.

/** Half-width of what you see sitting down: roughly a phone's main-camera view (~70°). */
export const HALF_VIEW_DEGREES = 35;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Sun's declination on a day of the year (1–365), in degrees. Accurate to ~1°. */
export function declination(dayOfYear: number): number {
  return -23.44 * Math.cos(rad((360 / 365) * (dayOfYear + 10)));
}

/** Azimuth of sunrise on the 15th of a month (0 = January) at a latitude. */
export function sunriseAzimuth(month: number, latitude: number): number {
  const d = declination(DAYS_BEFORE_MONTH[month] + 15);
  return deg(Math.acos(Math.sin(rad(d)) / Math.cos(rad(latitude))));
}

export const sunsetAzimuth = (month: number, latitude: number) => 360 - sunriseAzimuth(month, latitude);

/** Smallest angle between two compass directions (0–180). */
export function angleBetween(a: number, b: number): number {
  const diff = Math.abs((((a - b) % 360) + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

/** Months (0–11) in which the sun rises/sets within view of a seat facing `facing`. */
export function monthsInView(event: "sunrise" | "sunset", facing: number, latitude: number, half = HALF_VIEW_DEGREES) {
  const at = event === "sunrise" ? sunriseAzimuth : sunsetAzimuth;
  return MONTHS.map((_, m) => m).filter((m) => angleBetween(at(m, latitude), facing) <= half);
}

/**
 * "all year", "June", "May to July", or for a run that wraps the new year "November to January".
 * Assumes the months form one run, which holds for sunrise/sunset (they sweep back and forth once a year).
 */
export function describeMonths(months: number[]): string {
  if (months.length === 0) return "";
  if (months.length === 12) return "all year";
  const set = new Set(months);
  // Start of the run: a month in the set whose previous month isn't.
  const start = months.find((m) => !set.has((m + 11) % 12)) ?? months[0];
  let end = start;
  while (set.has((end + 1) % 12) && (end + 1) % 12 !== start) end = (end + 1) % 12;
  return start === end ? MONTHS[start] : `${MONTHS[start]} to ${MONTHS[end]}`;
}

export type SunNote =
  | { kind: "sunset" | "sunrise"; months: number[]; when: string }
  | { kind: "behind" | "midday" };

/** What the sun does from this seat. */
export function sunNote(facing: number, latitude: number): SunNote {
  const sunset = monthsInView("sunset", facing, latitude);
  if (sunset.length > 0) return { kind: "sunset", months: sunset, when: describeMonths(sunset) };
  const sunrise = monthsInView("sunrise", facing, latitude);
  if (sunrise.length > 0) return { kind: "sunrise", months: sunrise, when: describeMonths(sunrise) };
  // North of the equator's tropics the sun spends the day in the southern sky.
  const facingNorth = angleBetween(facing, latitude >= 0 ? 0 : 180) < 90;
  return { kind: facingNorth ? "behind" : "midday" };
}

/** Short phrase for the "At a glance" list. */
export function sunSummary(note: SunNote): string {
  switch (note.kind) {
    case "sunset":
      return `Sets in front of you, ${note.when}`;
    case "sunrise":
      return `Rises in front of you, ${note.when}`;
    case "behind":
      return "Behind or beside you all day";
    case "midday":
      return "In front of you around midday";
  }
}
