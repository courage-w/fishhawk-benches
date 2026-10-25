import { describe, expect, it } from "vitest";
import { RateLimiter } from "../../src/lib/contact/rate-limit";
import { spamReason, validateContact } from "../../src/lib/contact/validate";
import { escapeXml } from "../../src/lib/feed";

const good = { name: "Sam", email: "sam@example.com", topic: "suggest", message: "There's a bench near the dog park." };

describe("validateContact", () => {
  it("accepts a normal message", () => {
    expect(validateContact(good).ok).toBe(true);
  });

  it("explains each problem", () => {
    const r = validateContact({ name: "", email: "nope", topic: "hack", message: "hi" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "topic"]);
    expect(r.errors.email).toMatch(/email address/);
  });

  it("strips line breaks from single-line fields (no header injection)", () => {
    const r = validateContact({ ...good, name: "Sam\r\nBcc: victim@example.com" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).not.toMatch(/[\r\n]/);
    expect(validateContact({ ...good, email: "a@example.com\r\nBcc: x@example.com" }).ok).toBe(false);
  });

  it("caps message length", () => {
    expect(validateContact({ ...good, message: "x".repeat(4001) }).ok).toBe(false);
  });

  it("ignores non-string input", () => {
    expect(validateContact({ ...good, email: ["a@example.com"] }).ok).toBe(false);
  });
});

describe("spamReason", () => {
  it("flags the honeypot, instant posts and link floods", () => {
    expect(spamReason({ honeypot: "http://spam", elapsedMs: 10_000, message: "hi" })).toBe("honeypot");
    expect(spamReason({ honeypot: "", elapsedMs: 500, message: "hi" })).toBe("too-fast");
    expect(spamReason({ honeypot: "", elapsedMs: 10_000, message: "http://a http://b http://c http://d" })).toBe("too-many-links");
    expect(spamReason({ honeypot: "", elapsedMs: null, message: "no js, still fine" })).toBeNull();
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit per window, then resets", () => {
    let now = 0;
    const rl = new RateLimiter(2, 1000, () => now);
    expect([rl.hit("ip"), rl.hit("ip"), rl.hit("ip")]).toEqual([true, true, false]);
    expect(rl.hit("other")).toBe(true);
    now = 1001;
    expect(rl.hit("ip")).toBe(true);
  });

  it("stays bounded under a flood of unique keys", () => {
    const rl = new RateLimiter(1, 60_000, () => 0, 100);
    for (let i = 0; i < 1000; i++) rl.hit(`k${i}`);
    expect((rl as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(100);
  });
});

describe("escapeXml", () => {
  it("neutralises markup and illegal characters", () => {
    expect(escapeXml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &apos;y&apos;",
    );
    expect(escapeXml("a\u0000b\u0008c")).toBe("abc");
  });
});
