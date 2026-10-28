"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) that keeps visited pages readable offline. */
export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline reading is a bonus; the site works the same without it.
    });
  }, []);
  return null;
}
