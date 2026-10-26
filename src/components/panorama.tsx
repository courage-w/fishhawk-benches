"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type SeatView = { center: number; width: number };

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Optional tiny base64 image shown while the panorama loads. */
  blurDataURL?: string;
  /** Where the view from the seat is (fractions of the width). Marked with two lines and scrolled into view. */
  seatView?: SeatView;
  /** Above the fold: load immediately at high priority. */
  eager?: boolean;
  label: string;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A wide panorama in a sideways-scrolling strip, with an overview bar underneath showing the
 * whole scene, the part on screen, and the seat view. Works with touch, trackpad, scrollbar,
 * arrow keys, mouse drag, or tapping/dragging the overview. Never narrower than the screen.
 */
export function Panorama({ src, alt, width, height, blurDataURL, seatView, eager, label }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ left: 0, width: 1 });
  const focus = seatView?.center ?? 0.5;

  // Track which part of the panorama is on screen, at most once per animation frame.
  const frame = useRef(0);
  const syncView = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = strip.current;
      if (!el || el.scrollWidth === 0) return;
      setView({ left: el.scrollLeft / el.scrollWidth, width: el.clientWidth / el.scrollWidth });
    });
  }, []);

  /** Scroll so `fraction` of the panorama sits in the middle of the screen. */
  const centerOn = useCallback((fraction: number, smooth: boolean) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, el.scrollWidth * fraction - el.clientWidth / 2),
      behavior: smooth && !reducedMotion() ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    // The track's width comes from CSS, not the image, so we can center before the photo loads.
    centerOn(focus, false);
    syncView();

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
    const resize = new ResizeObserver(syncView);
    resize.observe(el);
    el.addEventListener("scroll", syncView, { passive: true });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(frame.current);
      resize.disconnect();
      el.removeEventListener("scroll", syncView);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [focus, centerOn, syncView]);

  // Overview bar: tap or drag anywhere to look at that part of the scene.
  const scrub = (e: ReactPointerEvent<HTMLDivElement>, smooth: boolean) => {
    const box = e.currentTarget.getBoundingClientRect();
    centerOn(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)), smooth);
  };

  const aspect = width / height;
  const seatInView =
    seatView !== undefined &&
    seatView.center >= view.left + view.width * 0.2 &&
    seatView.center <= view.left + view.width * 0.8;

  // The mini-map only earns its space when most of the scene is off-screen (phones, laptops);
  // on wide monitors nearly the whole panorama already fits, so it stays hidden.
  const showInset = view.width < 0.7;

  return (
    <div className="relative">
      <div ref={strip} className="panorama photo-frame" tabIndex={0} role="region" aria-label={label}>
        <div className="pano-track" style={{ "--pano-aspect": aspect } as CSSProperties}>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            placeholder={blurDataURL ? "blur" : "empty"}
            blurDataURL={blurDataURL}
            draggable={false}
            // Rendered at clamp(16rem, 52vh, 34rem) tall: ~440px on a phone, up to 544px on desktop,
            // and wider screens scale it up to fill the width.
            sizes={`(max-width: 640px) ${Math.round(440 * aspect)}px, max(100vw, ${Math.round(544 * aspect)}px)`}
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

      <div className="pano-inset" data-visible={showInset} inert={!showInset}>
        <div
          className="pano-overview"
          style={{ "--pano-aspect": aspect } as CSSProperties}
          aria-hidden="true"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e, true);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1 || e.pointerType === "touch") scrub(e, false);
          }}
        >
          <Image src={src} alt="" width={width} height={height} sizes="448px" draggable={false} />
          {seatView && (
            <span
              className="pano-overview-seat"
              style={{ left: `${(seatView.center - seatView.width / 2) * 100}%`, width: `${seatView.width * 100}%` }}
            />
          )}
          <span
            className="pano-overview-window"
            style={{ left: `${view.left * 100}%`, width: `${Math.min(1, view.width) * 100}%` }}
          />
        </div>
        {seatView && !seatInView && (
          <button type="button" onClick={() => centerOn(seatView.center, true)} className="pano-inset-button">
            Seat view
          </button>
        )}
      </div>
    </div>
  );
}
