"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

export type SeatView = { center: number; width: number };

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Where the view from the seat is (fractions of the width). Marked with two lines and scrolled into view. */
  seatView?: SeatView;
  /** Above the fold: load immediately at high priority. */
  eager?: boolean;
  label: string;
};

/**
 * A wide panorama in a sideways-scrolling strip. Works with touch, trackpad,
 * the scrollbar, or arrow keys once focused; mouse users can also drag.
 * The strip is never narrower than the screen, so no background shows beside the photo.
 */
export function Panorama({ src, alt, width, height, seatView, eager, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const focus = seatView?.center ?? 0.5;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The track's width comes from CSS, not the image, so we can center before the photo loads.
    el.scrollLeft = Math.max(0, el.scrollWidth * focus - el.clientWidth / 2);

    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      el.dataset.dragging = "true";
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      el.scrollLeft -= e.clientX - lastX;
      lastX = e.clientX;
    };
    const up = () => {
      dragging = false;
      el.dataset.dragging = "false";
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [focus]);

  const aspect = width / height;
  return (
    <div ref={ref} className="panorama photo-frame" tabIndex={0} role="region" aria-label={label}>
      <div className="pano-track" style={{ "--pano-aspect": aspect } as CSSProperties}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          draggable={false}
          // Rendered at 16–34rem tall (wider screens scale it up to fill the width).
          sizes={`(max-width: 640px) ${Math.round(256 * aspect)}px, max(100vw, ${Math.round(544 * aspect)}px)`}
        />
        {seatView && (
          <div
            className="seat-view"
            aria-hidden="true"
            style={{ left: `${(seatView.center - seatView.width / 2) * 100}%`, width: `${seatView.width * 100}%` }}
          >
            <span className="seat-view-label">View from the seat</span>
          </div>
        )}
      </div>
    </div>
  );
}
