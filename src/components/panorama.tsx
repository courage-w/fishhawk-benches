"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Where to start, 0 = left edge, 1 = right edge. */
  start?: number;
  /** Above the fold: load immediately at high priority. */
  eager?: boolean;
  label: string;
};

/**
 * A wide panorama in a sideways-scrolling strip. Works with touch, trackpad,
 * the scrollbar, or arrow keys once focused; mouse users can also drag.
 */
export function Panorama({ src, alt, width, height, start = 0.5, eager, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const center = () => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) * start;
    };
    const img = el.querySelector("img");
    if (img?.complete) center();
    else img?.addEventListener("load", center, { once: true });

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
      img?.removeEventListener("load", center);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [start]);

  return (
    <div
      ref={ref}
      className="panorama photo-frame"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        draggable={false}
        // Height is fixed by CSS (16–34rem), so the rendered width is height × aspect ratio.
        sizes={`(max-width: 640px) ${Math.round((256 * width) / height)}px, ${Math.round((544 * width) / height)}px`}
      />
    </div>
  );
}
