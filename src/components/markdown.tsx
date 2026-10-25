import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Content is rendered as Markdown only: raw HTML is not parsed (no rehype-raw), there is
// no MDX/JSX execution, and react-markdown's default urlTransform drops javascript: and
// other unsafe URLs. Images are disallowed; bench photos come from validated frontmatter.

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

const components: Components = {
  h1: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
  a: ({ href = "", children }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} rel="noopener noreferrer nofollow" target="_blank">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ),
  img: () => null,
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/** Headings for a table of contents, shown only when a body is long enough to need one. */
export function headingsOf(source: string): { id: string; text: string }[] {
  return [...source.matchAll(/^#{1,2}\s+(.+)$/gm)].map((m) => ({ id: slugify(m[1]), text: m[1].trim() }));
}
