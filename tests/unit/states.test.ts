// The loading, error and 404 screens, rendered to HTML directly. These are hard to reach in a
// browser test (pages are prerendered, so the loading skeleton rarely shows, and errors need a
// broken page), so check here that each one says something useful and offers a way forward.
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingSkeleton } from "../../src/components/loading-skeleton";
import ErrorPage from "../../src/app/error";
import GlobalError from "../../src/app/global-error";
import NotFound from "../../src/app/not-found";

function render<P extends object>(component: ComponentType<P>, ...props: Record<string, never> extends P ? [P?] : [P]) {
  return renderToStaticMarkup(createElement(component, props[0] ?? ({} as P)));
}

describe("loading skeleton", () => {
  it("announces itself as loading to screen readers", () => {
    const html = render(LoadingSkeleton);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading"');
    expect(html).toContain("Loading…");
  });

  it("stops pulsing for people who prefer reduced motion", () => {
    expect(render(LoadingSkeleton)).toContain("motion-reduce:animate-none");
  });

  it("reserves panorama space on bench pages so the page doesn't jump", () => {
    expect(render(LoadingSkeleton, { withPanorama: true })).toContain("h-[clamp(16rem,52vh,34rem)]");
  });
});

describe("error page", () => {
  const html = render(ErrorPage, { error: new Error("boom"), retry: () => {} });

  it("explains what happened without exposing the error", () => {
    expect(html).toContain("Something went wrong.");
    expect(html).not.toContain("boom");
  });

  it("offers a retry button and a way home", () => {
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Try again<\/button>/);
    expect(html).toContain('href="/"');
  });
});

describe("site-wide error page", () => {
  const html = render(GlobalError, { error: new Error("boom"), retry: () => {} });

  it("is a complete document, since it replaces the whole layout", () => {
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toContain("<title>Something went wrong | FishHawk Benches</title>");
    expect(html).toContain("<main");
  });

  it("offers a retry button and a plain link home", () => {
    expect(html).toContain("Try again");
    expect(html).toContain('<a href="/">Go to the home page</a>');
    expect(html).not.toContain("boom");
  });
});

describe("404 page", () => {
  const html = render(NotFound);

  it("says plainly that nothing is here", () => {
    expect(html).toContain("This bench is empty.");
  });

  it("links to the bench list, the map and home", () => {
    for (const href of ["/benches", "/map", "/"]) expect(html).toContain(`href="${href}"`);
  });
});
