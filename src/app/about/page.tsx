import type { Metadata } from "next";
import Link from "next/link";
import { RULES } from "@/lib/content/traits";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "About",
  description: "Why FishHawk Benches exists, how each bench is photographed, and how the pros and cons are decided.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">About</h1>
      <div className="prose mt-8">
        <p className="lede">
          Some benches have a lovely view of a pond. Some face a row of utility boxes. This site helps you tell
          which is which before you walk there.
        </p>
        <p>
          FishHawk Benches is a small, independent guide to the public benches along the sidewalks and trails of
          FishHawk Ranch in Lithia, Florida. It&apos;s a hobby project, made on foot with a phone.
        </p>

        <h2>How each bench is photographed</h2>
        <p>Every bench gets the same set of photos, taken from the same spots:</p>
        <ul>
          <li>The view from the seat, so you know what you&apos;ll be looking at.</li>
          <li>A couple of photos of the bench itself and its surroundings.</li>
          <li>A panorama taken from the bench, so you can look all the way around.</li>
        </ul>
        <p>
          The phone records where and when each photo was taken and which way it was pointing. That&apos;s how the
          photos get grouped by bench, how each bench is pinned on the <Link href="/map">map</Link>, and how the
          site knows which direction the seat faces. Before any photo goes online, all of that hidden information
          is removed from the image file.
        </p>

        <h2>How the pros and cons are decided</h2>
        <p>Every bench is judged by the same simple rules, so they&apos;re easy to compare:</p>
      </div>

      <div className="mt-6 max-w-3xl overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Rules for pros and cons</caption>
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className="py-2 pr-4 font-normal text-ink-soft">When</th>
              <th scope="col" className="py-2 font-normal text-ink-soft">It counts as</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.when} className="border-b border-rule align-top">
                <td className="py-3 pr-4">{r.when}</td>
                <td className="py-3">{r.pro ? <>Pro: {r.pro}</> : <>Con: {r.con}</>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose mt-6">
        <p>
          Anything a rule doesn&apos;t cover, like flowers in a roundabout or a lamp post in the way, gets added by
          hand.
        </p>

        <h2>Things change</h2>
        <p>
          Trees grow, benches get moved, trash cans come and go. Each bench page shows the date it was added. If
          something has changed, or you know a bench that should be here, please{" "}
          <Link href="/contact">say hello</Link>.
        </p>
      </div>
    </div>
  );
}
