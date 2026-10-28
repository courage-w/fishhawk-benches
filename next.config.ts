import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static CSP (no per-request nonce) so pages stay prerendered and CDN-cacheable.
// 'unsafe-inline' for scripts is required by Next's inline bootstrap scripts without nonces;
// the risk is limited because no user- or content-supplied HTML is ever rendered (see CLAUDE.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  // The service worker re-fetches map tiles so it can keep the ones you've seen for offline use.
  "connect-src 'self' https://tile.openstreetmap.org",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Browsers ignore HSTS over plain http, so this is harmless locally and protects production.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // OpenStreetMap's tile policy needs a Referer; strict-origin sends only the origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    qualities: [75],
    // 2560 sits between the defaults 2048 and 3840 so panoramas (~2400px wide on screen) don't jump to 3840.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    formats: ["image/avif", "image/webp"],
    // Bench photos are content, not user uploads; only local files are optimized.
    remotePatterns: [],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Photo file names never change once published (a new photo gets a new name).
        source: "/photos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Browsers must check for a new service worker on every visit, or old ones linger.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
