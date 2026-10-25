// Groups photos taken at the same spot. Used by scripts/ingest.ts and unit-tested.
import { distanceMeters, type LatLng } from "./geo.ts";

export type PhotoPoint = LatLng & {
  file: string;
  takenAt: Date;
  isPanorama: boolean;
};

export type ClusterOptions = {
  /** Start a new group after this many minutes without a photo. */
  maxGapMinutes: number;
  /** Start a new group when a photo is this far from the group's first photo. */
  maxDistanceMeters: number;
  /**
   * The panorama is usually the last shot at a bench, so once a group has one,
   * a photo this far from the panorama starts a new group. Separates benches
   * that are close together while keeping a quick extra shot after the panorama.
   */
  afterPanoramaMeters: number;
};

export const DEFAULT_CLUSTER_OPTIONS: ClusterOptions = {
  maxGapMinutes: 5,
  maxDistanceMeters: 25,
  afterPanoramaMeters: 12,
};

export function clusterPhotos<T extends PhotoPoint>(
  photos: T[],
  options: ClusterOptions = DEFAULT_CLUSTER_OPTIONS,
): T[][] {
  const sorted = [...photos].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const groups: T[][] = [];

  for (const photo of sorted) {
    const current = groups.at(-1);
    const previous = current?.at(-1);
    const anchor = current?.[0];
    const panorama = current?.find((p) => p.isPanorama);

    const startNew =
      !current ||
      !previous ||
      !anchor ||
      photo.takenAt.getTime() - previous.takenAt.getTime() > options.maxGapMinutes * 60_000 ||
      distanceMeters(anchor, photo) > options.maxDistanceMeters ||
      (panorama !== undefined && distanceMeters(panorama, photo) > options.afterPanoramaMeters);

    if (startNew) groups.push([photo]);
    else current.push(photo);
  }

  return groups;
}

/** Panoramas from a phone are very wide; regular photos are at most ~16:9. */
export function isPanoramaSize(width: number, height: number): boolean {
  return width / height >= 2.5;
}

/**
 * EXIF stores wall-clock time ("2026:10:25 14:43:23") plus an optional offset
 * ("-04:00"). Returns an ISO string that keeps the photographer's local time.
 */
export function exifDateToIso(dateTime: string, offset?: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(dateTime.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const off = offset && /^[+-]\d{2}:\d{2}$/.test(offset.trim()) ? offset.trim() : "";
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${off}`;
}
