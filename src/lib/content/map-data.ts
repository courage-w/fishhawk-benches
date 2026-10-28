// Slim, serializable shapes for the client-side map (keeps bench bodies out of the JS payload).
import type { MapBench, MapTrash } from "@/components/bench-map";
import { thumbUrl } from "@/lib/images";
import { photoSrc, type Bench } from "./parse";
import type { TrashSpot } from "./schema";

export function toMapBenches(benches: Bench[]): MapBench[] {
  return benches.map((b) => {
    const photo = b.view ?? b.photos[0];
    return {
      slug: b.slug,
      title: b.title,
      lat: b.location.lat,
      lng: b.location.lng,
      summary: b.summary,
      trashCan: b.features.trashCan,
      thumb: photo ? thumbUrl(photoSrc(b.slug, photo)) : null,
    };
  });
}

export function toMapTrash(spots: TrashSpot[]): MapTrash[] {
  return spots.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    dogBags: s.dogBags ?? false,
    thumb: s.photo ? thumbUrl(`/photos/trash/${s.photo}`) : null,
  }));
}
