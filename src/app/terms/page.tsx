import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/bench-parts";

export const ensureStatic = "navigation";

const UPDATED = "2026-10-25";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The ground rules for using FishHawk Benches and its photos.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">Terms of use</h1>
      <p className="meta mt-4">Last updated {formatDate(UPDATED)}</p>
      <div className="prose mt-8">
        <p className="lede">By using this site you agree to these terms. They&apos;re short.</p>

        <h2>What this site is</h2>
        <p>
          FishHawk Benches is a free, independent guide to public benches in FishHawk Ranch. It isn&apos;t
          affiliated with, endorsed by, or speaking for any homeowners&apos; association, community development
          district, developer, or government body.
        </p>

        <h2>Information may be out of date</h2>
        <p>
          Bench descriptions, photos, locations, and pros and cons reflect what we saw on the date each bench was
          added. Benches, trash cans, trees, and paths change. We share this in good faith but can&apos;t promise it&apos;s
          accurate or complete, and the site is provided &quot;as is&quot;.
        </p>

        <h2>Stay safe</h2>
        <p>
          You&apos;re responsible for your own safety when visiting any location shown here. Watch for traffic near
          roads, and remember that Florida ponds can be home to alligators and snakes. Keep a safe distance from the
          water&apos;s edge, and keep children and pets close. Respect private property and posted rules.
        </p>

        <h2>Photos and text</h2>
        <p>
          The photos and writing on this site belong to FishHawk Benches unless a credit says otherwise. You&apos;re
          welcome to link to any page. Please ask before reusing photos or text elsewhere. Map data is ©
          OpenStreetMap contributors, available under the Open Database License.
        </p>

        <h2>Sending us messages</h2>
        <p>
          Please don&apos;t use the contact form to send anything unlawful, abusive, or spam. If you suggest a bench or
          a correction, you&apos;re letting us use that information on the site.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms; the date at the top shows when they last changed. Questions?{" "}
          <Link href="/contact">Say hello</Link>.
        </p>
      </div>
    </div>
  );
}
