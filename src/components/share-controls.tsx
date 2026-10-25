"use client";

import { useEffect, useState } from "react";

/** Copy-link always works; the system share sheet appears only where the browser supports it. */
export function ShareControls({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Feature detection has to wait for the browser, so this button never renders dead on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setStatus("Couldn't copy automatically. The link is in your address bar.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url });
    } catch {
      // The reader closed the share sheet; nothing to report.
    }
  }

  const button =
    "inline-flex min-h-11 items-center rounded-full border border-rule px-4 text-base text-ink no-underline hover:border-pond hover:text-pond cursor-pointer";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={button}>
          Copy link
        </button>
        {canShare && (
          <button type="button" onClick={share} className={button}>
            Share
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="meta mt-2 min-h-6">
        {status}
      </p>
    </div>
  );
}
