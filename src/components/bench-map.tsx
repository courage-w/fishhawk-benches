"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

export type MapBench = {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  summary: string;
  trashCan: boolean;
  thumb: string | null;
};

export type MapTrash = { id: string; lat: number; lng: number; thumb: string | null };

type Props = {
  benches: MapBench[];
  trash?: MapTrash[];
  /** Highlight this bench and centre on it. */
  activeSlug?: string;
  zoom?: number;
  className?: string;
  /** Show the "Benches / Trash cans" checkboxes. */
  showToggles?: boolean;
  label: string;
};

const BENCH_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9.5h16M4 6.5h16M3 13h18M6 13v5M18 13v5M6 6.5v6.5M18 6.5v6.5"/></svg>';
const TRASH_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M6.5 7l1 12h9l1-12"/></svg>';

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

export function BenchMap({ benches, trash = [], activeSlug, zoom, className = "h-96", showToggles, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<{ benches?: LayerGroup; trash?: LayerGroup }>({});
  const [showBenches, setShowBenches] = useState(true);
  const [showTrash, setShowTrash] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
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
            return marker.bindPopup(
              popup({ title: b.title, text: active ? "You're looking at this one." : note, href: active ? undefined : `/benches/${b.slug}`, img: b.thumb }),
            );
          }),
        ).addTo(m);

        const trashLayer = L.layerGroup(
          trash.map((t) =>
            L.marker([t.lat, t.lng], {
              title: "Trash can",
              alt: "Trash can",
              keyboard: true,
              icon: L.divIcon({
                className: "",
                html: `<span class="pin pin-trash">${TRASH_SVG}</span>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10],
              }),
            }).bindPopup(popup({ title: "Trash can", img: t.thumb })),
          ),
        ).addTo(m);
        layers.current = { benches: benchLayer, trash: trashLayer };

        // Frame the pins once the container has a real size; fitting at 0×0 jumps to max zoom.
        const active = benches.find((b) => b.slug === activeSlug);
        const points = [...benches, ...trash].map((p) => [p.lat, p.lng] as [number, number]);
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
    };
  }, [benches, trash, activeSlug, zoom]);

  useEffect(() => {
    const m = map.current;
    const { benches: b, trash: t } = layers.current;
    if (!m || !b || !t) return;
    if (showBenches) b.addTo(m);
    else b.remove();
    if (showTrash) t.addTo(m);
    else t.remove();
  }, [showBenches, showTrash]);

  return (
    <div>
      {showToggles && (
        <fieldset className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
          <legend className="sr-only">Show on the map</legend>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showBenches} onChange={(e) => setShowBenches(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
            <span className="pin pin-bench scale-75" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BENCH_SVG }} />
            Benches ({benches.length})
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showTrash} onChange={(e) => setShowTrash(e.target.checked)} className="h-5 w-5 accent-[var(--pond)]" />
            <span className="pin pin-trash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TRASH_SVG }} />
            Trash cans ({trash.length})
          </label>
        </fieldset>
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
