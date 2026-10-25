import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/bench-parts";

export const ensureStatic = "navigation";

const UPDATED = "2026-10-25";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What FishHawk Benches collects (very little), why, and who else is involved.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">Privacy policy</h1>
      <p className="meta mt-4">Last updated {formatDate(UPDATED)}</p>
      <div className="prose mt-8">
        <p className="lede">The short version: no accounts, no cookies, no analytics, no ads, no tracking.</p>

        <h2>Who we are</h2>
        <p>
          FishHawk Benches is a small independent website run by one person (&quot;we&quot; on this page). You can
          reach us through the <Link href="/contact">contact form</Link>.
        </p>

        <h2>Browsing the site</h2>
        <p>
          We don&apos;t set cookies, use analytics, or show ads. Like any website, the hosting service that delivers
          these pages handles your IP address and basic request details (such as the page requested and your browser
          type) in order to serve the page, and may keep them in short-lived server logs for security and
          troubleshooting. We don&apos;t use those logs to identify or profile visitors.
        </p>

        <h2>The map</h2>
        <p>
          Map images are loaded directly from OpenStreetMap&apos;s tile servers. When a page with a map loads, your
          browser asks OpenStreetMap for those images, so OpenStreetMap receives your IP address and the address of
          the page you&apos;re on. Their use of that data is covered by the{" "}
          <a href="https://osmfoundation.org/wiki/Privacy_Policy" rel="noopener noreferrer" target="_blank">
            OpenStreetMap Foundation privacy policy<span className="sr-only"> (opens in a new tab)</span>
          </a>
          . The &quot;Open in Google Maps&quot; and &quot;Open in Apple Maps&quot; links take you to those services,
          under their own policies, only if you click them.
        </p>

        <h2>The contact form</h2>
        <p>When you send a message we receive:</p>
        <ul>
          <li>your email address, so we can reply,</li>
          <li>your name, if you choose to give it,</li>
          <li>the topic and message you write.</li>
        </ul>
        <p>
          The website doesn&apos;t store these. They&apos;re passed to our email delivery provider,{" "}
          <a href="https://resend.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
            Resend<span className="sr-only"> (opens in a new tab)</span>
          </a>
          , which sends them to our inbox. Messages stay in that inbox until we delete them. We use them only to read
          and answer your note, and never for marketing.
        </p>
        <p>
          To limit spam, the server briefly keeps a count of how many messages arrive from each IP address. That
          count is held in memory only, is never written to disk, and resets within about 15 minutes.
        </p>

        <h2>Photos</h2>
        <p>
          Bench photos are taken in public places. Before publishing, we remove the hidden data phones attach to
          photos (including the GPS location and camera details). If you appear in a photo and would like it
          removed, <Link href="/contact">let us know</Link> and we&apos;ll take it down.
        </p>

        <h2>Your choices</h2>
        <p>
          You can ask us to tell you what we hold about you (normally just any messages you sent) or to delete it,
          using the <Link href="/contact">contact form</Link>.
        </p>

        <h2>Changes</h2>
        <p>
          If we change how the site handles data, for example by adding a new service, we&apos;ll update this page
          and the date at the top before the change goes live.
        </p>
      </div>
    </div>
  );
}
