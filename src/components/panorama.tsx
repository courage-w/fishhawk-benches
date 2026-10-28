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

/**
 * How wide the seat-view frame is, in panorama heights. Every panorama is shot at the same height
 * of view, so a fixed multiple of the height is the same angle everywhere (about what you take in
 * sitting still) and the frame looks the same on every bench. The stored `width` varied with how
 * each view photo was zoomed, which made some frames twice as wide as others.
 */
const SEAT_VIEW_HEIGHTS = 0.9;

/** Left edge and width of the seat-view frame, as fractions of the panorama width. */
function seatSpan(seatView: SeatView, aspect: number) {
  const width = Math.min(1, SEAT_VIEW_HEIGHTS / aspect);
  const left = Math.min(1 - width, Math.max(0, seatView.center - width / 2));
  return { left: `${left * 100}%`, width: `${width * 100}%` };
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A wide panorama in a sideways-scrolling strip, with an overview bar underneath showing the
 * whole scene, the part on screen, and the seat view. Works with touch, trackpad, scrollbar,
 * arrow keys, mouse drag, or tapping/dragging the overview. Never narrower than the screen.
 */
export function Panorama({ src, alt, width, height, blurDataURL, seatView, eager, label }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  /** The white "you are here" box on the mini-map. Moved directly, never through React state. */
  const viewBox = useRef<HTMLSpanElement>(null);
  // Fraction of the panorama on screen; only changes on resize, so it rarely re-renders.
  const [visibleFraction, setVisibleFraction] = useState(1);
  const focus = seatView?.center ?? 0.5;

  // Runs inside every scroll event (the browser already fires those once per frame), so the
  // white box moves in the same frame as the photo, on the GPU via transform, with no easing.
  const syncView = useCallback(() => {
    const el = strip.current;
    if (!el || el.scrollWidth === 0) return;
    const left = el.scrollLeft / el.scrollWidth;
    const visible = el.clientWidth / el.scrollWidth;
    const box = viewBox.current;
    const map = box?.parentElement;
    if (box && map) {
      box.style.width = `${Math.min(1, visible) * 100}%`;
      box.style.transform = `translate3d(${left * map.clientWidth}px, 0, 0)`;
    }
    setVisibleFraction((v) => (Math.abs(v - visible) > 0.001 ? visible : v));
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
    // The mini-map changes size when it appears or the window resizes; keep the box in step.
    if (viewBox.current?.parentElement) resize.observe(viewBox.current.parentElement);
    el.addEventListener("scroll", syncView, { passive: true });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      resize.disconnect();
      el.removeEventListener("scroll", syncView);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [focus, centerOn, syncView]);

  // Mini-map gestures. A tap jumps there; a sideways drag scrubs. A mostly-vertical swipe is left
  // to the browser so the page scrolls normally even when your thumb starts on the mini-map.
  const gesture = useRef<{ id: number; x: number; y: number; mode: "pending" | "drag" | "scroll" } | null>(null);
  const scrubTo = (el: HTMLElement, clientX: number, smooth: boolean) => {
    const box = el.getBoundingClientRect();
    centerOn(Math.min(1, Math.max(0, (clientX - box.left) / box.width)), smooth);
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mode: "pending" };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || g.mode === "scroll") return;
    if (g.mode === "pending") {
      const dx = Math.abs(e.clientX - g.x);
      const dy = Math.abs(e.clientY - g.y);
      if (dx < 6 && dy < 6) return;
      if (dy >= dx) {
        g.mode = "scroll";
        return;
      }
      g.mode = "drag";
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    scrubTo(e.currentTarget, e.clientX, false);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g && g.id === e.pointerId && g.mode === "pending") scrubTo(e.currentTarget, e.clientX, true);
    gesture.current = null;
  };

  const aspect = width / height;

  // The mini-map only earns its space when most of the scene is off-screen (phones, laptops);
  // on wide monitors nearly the whole panorama already fits, so it stays hidden.
  const showInset = visibleFraction < 0.7;

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
              style={seatSpan(seatView, aspect)}
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (gesture.current = null)}
        >
          <Image src={src} alt="" width={width} height={height} sizes="448px" draggable={false} />
          {seatView && (
            <span
              className="pano-overview-seat"
              style={seatSpan(seatView, aspect)}
            />
          )}
          <span
            ref={viewBox}
            className="pano-overview-window"
          />
        </div>
      </div>
    </div>
  );
}
