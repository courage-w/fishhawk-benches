"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { CircleMarker, LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { bearingDegrees, compassPoint, distanceMeters } from "@/lib/geo";

export type MapBench = {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  summary: string;
  trashCan: boolean;
  /** Tag slugs, used by the filter buttons. */
  tags: string[];
  thumb: string | null;
};

export type MapTrash = { id: string; lat: number; lng: number; dogBags: boolean; thumb: string | null };

export type MapWish = { id: string; lat: number; lng: number; note: string; thumb: string | null };

export type MapFilter = { slug: string; label: string };

type Props = {
  benches: MapBench[];
  trash?: MapTrash[];
  wishes?: MapWish[];
  /** Highlight this bench and centre on it. */
  activeSlug?: string;
  zoom?: number;
  className?: string;
  /** Show the "Benches / Trash cans / Dog bags / Wishes" checkboxes. */
  showToggles?: boolean;
  /** Tag buttons that narrow the benches shown (all chosen tags must match). */
  filters?: MapFilter[];
  /** Show the "Find the nearest bench" button. */
  locate?: boolean;
  label: string;
};

const BENCH_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9.5h16M4 6.5h16M3 13h18M6 13v5M18 13v5M6 6.5v6.5M18 6.5v6.5"/></svg>';
const TRASH_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M6.5 7l1 12h9l1-12"/></svg>';
const DOG_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="9.5" cy="5.8" r="2.2"/><circle cx="14.5" cy="5.8" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/></svg>';

// Stable defaults: a fresh `[]` each render would re-run the map effect and rebuild the map.
const NO_TRASH: MapTrash[] = [];
const NO_WISHES: MapWish[] = [];
const NO_FILTERS: MapFilter[] = [];

const WALK_METERS_PER_MINUTE = 80;
/** Farther than this from every bench, the reader is probably not in FishHawk right now. */
const FAR_AWAY_METERS = 5000;

function distanceText(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

// Popups are built with DOM APIs and textContent, never HTML strings, so content can't inject markup.
function popup(parts: { title: string; text?: string; href?: string; img?: string | null }) {
  const root = document.createElement("div");
  root.className = "grid gap-2 max-w-[14rem]";
  if (parts.img) {
    const img = document.createElement("img");
    img.src = parts.img;
    img.alt = "";
    img.width = 224;
    img.height = 168;
    img.className = "rounded-md object-cover aspect-[4/3] w-full";
    root.append(img);
  }
  const heading = document.createElement(parts.href ? "a" : "strong");
  heading.textContent = parts.title;
  if (parts.href) (heading as HTMLAnchorElement).href = parts.href;
  heading.className = "text-lg";
  root.append(heading);
  if (parts.text) {
    const p = document.createElement("span");
    p.textContent = parts.text;
    root.append(p);
  }
  return root;
}

type Found = { slug: string; title: string; meters: number; direction: string } | { far: true; meters: number };

export function BenchMap({
  benches,
  trash = NO_TRASH,
  wishes = NO_WISHES,
  activeSlug,
  zoom,
  className = "h-96",
  showToggles,
  filters = NO_FILTERS,
  locate,
  label,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<{ benches?: LayerGroup; trash?: LayerGroup; dog?: LayerGroup; wish?: LayerGroup }>({});
  const benchMarkers = useRef(new Map<string, Marker>());
  const youMarker = useRef<CircleMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [showBenches, setShowBenches] = useState(true);
  const [showTrash, setShowTrash] = useState(true);
  const [showDog, setShowDog] = useState(true);
  const [showWish, setShowWish] = useState(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [locateError, setLocateError] = useState("");
  const plainTrash = trash.filter((t) => !t.dogBags);
  const dogStations = trash.filter((t) => t.dogBags);
  const visible = benches.filter((b) => chosen.every((tag) => b.tags.includes(tag)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const markers = benchMarkers.current;
    (async () => {
      try {
        // Leaflet touches `window` on import, so load it only in the browser.
        const L = (await import("leaflet")).default;
        if (cancelled || !el.current || map.current) return;

        const m = L.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.5 });
        map.current = m;
        m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(m);

        markers.clear();
        const benchLayer = L.layerGroup(
          benches.map((b) => {
            const active = b.slug === activeSlug;
            const marker = L.marker([b.lat, b.lng], {
              title: b.title,
              alt: `Bench: ${b.title}`,
              keyboard: true,
              zIndexOffset: active ? 1000 : 0,
              icon: L.divIcon({
                className: "",
                html: `<span class="pin pin-bench" data-active="${active}">${BENCH_SVG}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -14],
              }),
            });
            const note = b.trashCan ? `${b.summary} Has a trash can beside it.` : b.summary;
            markers.set(b.slug, marker);
            return marker.bindPopup(
              popup({ title: b.title, text: active ? "You're looking at this one." : note, href: active ? undefined : `/benches/${b.slug}`, img: b.thumb }),
            );
          }),
        ).addTo(m);

        const smallPins = (spots: MapTrash[], title: string, className: string, svg: string, text?: string) =>
          L.layerGroup(
            spots.map((t) =>
              L.marker([t.lat, t.lng], {
                title,
                alt: title,
                keyboard: true,
                icon: L.divIcon({
                  className: "",
                  html: `<span class="pin ${className}">${svg}</span>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                  popupAnchor: [0, -10],
                }),
              }).bindPopup(popup({ title, text, img: t.thumb })),
            ),
          ).addTo(m);
        const trashLayer = smallPins(trash.filter((t) => !t.dogBags), "Trash can", "pin-trash", TRASH_SVG);
        const dogLayer = smallPins(trash.filter((t) => t.dogBags), "Dog bag station", "pin-dog", DOG_SVG, "Free bags and a trash can.");
        const wishLayer = L.layerGroup(
          wishes.map((w) =>
            L.marker([w.lat, w.lng], {
              title: "A bench would be nice here",
              alt: "Bench wish: no bench here yet",
              keyboard: true,
              icon: L.divIcon({
                className: "",
                html: `<span class="pin pin-wish">${BENCH_SVG}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -14],
              }),
            }).bindPopup(popup({ title: "A bench would be nice here", text: w.note, img: w.thumb })),
          ),
        ).addTo(m);
        layers.current = { benches: benchLayer, trash: trashLayer, dog: dogLayer, wish: wishLayer };
        setReady(true);

        // Frame the pins once the container has a real size; fitting at 0×0 jumps to max zoom.
        const active = benches.find((b) => b.slug === activeSlug);
        const points = [...benches, ...trash, ...wishes].map((p) => [p.lat, p.lng] as [number, number]);
        const frame = () => {
          m.invalidateSize();
          if (active) m.setView([active.lat, active.lng], zoom ?? 17);
          else if (points.length > 0) m.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 17 });
          else m.setView([27.8517, -82.2123], 15);
        };
        m.setView([27.8517, -82.2123], 15);
        let framed = false;
        observer = new ResizeObserver(([entry]) => {
          if (entry.contentRect.width === 0 || entry.contentRect.height === 0) return;
          if (!framed) {
            framed = true;
            frame();
          } else m.invalidateSize();
        });
        observer.observe(el.current);
        // Let readers scroll the page past the map; wheel zoom turns on after they click into it.
        m.on("focus click", () => m.scrollWheelZoom.enable());
        m.on("blur mouseout", () => m.scrollWheelZoom.disable());
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      youMarker.current = null;
      markers.clear();
      setReady(false);
    };
  }, [benches, trash, wishes, activeSlug, zoom]);

  const visibleKey = visible.map((b) => b.slug).join(" ");
  useEffect(() => {
    const m = map.current;
    const { benches: b, trash: t, dog: d, wish: w } = layers.current;
    if (!ready || !m || !b || !t || !d || !w) return;
    // Bench pins follow both the "Benches" checkbox and the chosen filters.
    const keep = new Set(visibleKey.split(" "));
    for (const [slug, marker] of benchMarkers.current) {
      if (keep.has(slug)) b.addLayer(marker);
      else b.removeLayer(marker);
    }
    if (showBenches) b.addTo(m);
    else b.remove();
    if (showTrash) t.addTo(m);
    else t.remove();
    if (showDog) d.addTo(m);
    else d.remove();
    if (showWish) w.addTo(m);
    else w.remove();
  }, [ready, visibleKey, showBenches, showTrash, showDog, showWish]);

  const toggleFilter = (slug: string) => {
    setFound(null);
    setChosen((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : [...c, slug]));
  };

  // The position is used only here in the browser; it's never sent anywhere or stored.
  const findNearest = () => {
    setLocateError("");
    setFound(null);
    if (!("geolocation" in navigator)) {
      setLocateError("Your browser can't share its location, so this button can't help here.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const pool = visible.length > 0 ? visible : benches;
        const ranked = pool
          .map((b) => ({ b, meters: distanceMeters(here, b) }))
          .sort((x, y) => x.meters - y.meters);
        const best = ranked[0];
        const m = map.current;
        if (!best || !m) return;
        if (best.meters > FAR_AWAY_METERS) {
          setFound({ far: true, meters: best.meters });
          return;
        }
        const L = (await import("leaflet")).default;
        // SVG attributes can't read CSS variables, so resolve the theme colours first.
        const css = getComputedStyle(document.documentElement);
        youMarker.current?.remove();
        youMarker.current = L.circleMarker([here.lat, here.lng], {
          radius: 8,
          color: css.getPropertyValue("--paper-raised").trim() || "#fff",
          weight: 3,
          fillColor: css.getPropertyValue("--pond").trim() || "#2b6cb0",
          fillOpacity: 1,
        })
          .bindTooltip("You are here")
          .addTo(m);
        setShowBenches(true);
        m.fitBounds(L.latLngBounds([[here.lat, here.lng], [best.b.lat, best.b.lng]]), { padding: [48, 48], maxZoom: 18 });
        benchMarkers.current.get(best.b.slug)?.openPopup();
        setFound({
          slug: best.b.slug,
          title: best.b.title,
          meters: best.meters,
          direction: compassPoint(bearingDegrees(here, best.b)),
        });
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this site. Allow it in your browser to find the nearest bench."
            : "Couldn't get your location just now. Try again in a moment.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  return (
    <div>
      {filters.length > 0 && (
        <div className="mb-3">
          <p id="map-filter-label" className="meta mb-2">
            Only show benches with…
          </p>
          <div role="group" aria-labelledby="map-filter-label" className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const on = chosen.includes(f.slug);
              return (
                <button
                  key={f.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFilter(f.slug)}
                  className={`min-h-11 rounded-full border px-4 ${on ? "border-[var(--pond)] bg-[var(--pond)] text-[var(--paper-raised)]" : "border-rule"}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <p className="meta mt-2" aria-live="polite">
            {chosen.length === 0
              ? `Showing all ${benches.length} benches.`
              : visible.length === 0
                ? "No bench has all of those yet. Try fewer filters."
                : `Showing ${visible.length} of ${benches.length} benches.`}
          </p>
        </div>
      )}
      {showToggles && (
        <fieldset className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
          <legend className="sr-only">Show on the map</legend>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showBenches} onChange={(e) => setShowBenches(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
            <span className="pin pin-bench scale-75" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BENCH_SVG }} />
            Benches ({visible.length})
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showTrash} onChange={(e) => setShowTrash(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
            <span className="pin pin-trash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TRASH_SVG }} />
            Trash cans ({plainTrash.length})
          </label>
          {dogStations.length > 0 && (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
              <input type="checkbox" checked={showDog} onChange={(e) => setShowDog(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
              <span className="pin pin-dog" aria-hidden="true" dangerouslySetInnerHTML={{ __html: DOG_SVG }} />
              Dog bag stations ({dogStations.length})
            </label>
          )}
          {wishes.length > 0 && (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
              <input type="checkbox" checked={showWish} onChange={(e) => setShowWish(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
              <span className="pin pin-wish scale-75" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BENCH_SVG }} />
              Bench wishes ({wishes.length})
            </label>
          )}
        </fieldset>
      )}
      {locate && (
        <div className="mb-4">
          <button
            type="button"
            onClick={findNearest}
            disabled={locating || !ready}
            className="min-h-11 rounded-full bg-[var(--moss)] px-5 text-[var(--paper-raised)] disabled:opacity-60"
          >
            {locating ? "Finding you…" : chosen.length > 0 ? "Find the nearest matching bench" : "Find the nearest bench"}
          </button>
          <p className="meta mt-2" aria-live="polite">
            {locateError ||
              (found && "far" in found
                ? `The nearest bench is ${distanceText(found.meters)} away, so you're probably not in FishHawk right now.`
                : found && (
                    <>
                      Nearest: <a href={`/benches/${found.slug}`}>{found.title}</a>, {distanceText(found.meters)} to the{" "}
                      {found.direction} (about{" "}
                      {Math.max(1, Math.round(found.meters / WALK_METERS_PER_MINUTE))} min walk).
                    </>
                  )) ||
              "Uses your location in this browser only. It isn't sent or saved."}
          </p>
        </div>
      )}
      <div className={`bench-map relative overflow-hidden rounded-lg border border-rule ${className}`}>
        <div ref={el} role="region" aria-label={label} className="absolute inset-0" />
        {failed && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center">
            The map couldn&apos;t load right now. Every bench is still listed on this page.
          </p>
        )}
        <noscript>
          <p className="absolute inset-0 grid place-items-center p-6 text-center">
            The map needs JavaScript. Every bench is still listed on this page.
          </p>
        </noscript>
      </div>
    </div>
  );
}
