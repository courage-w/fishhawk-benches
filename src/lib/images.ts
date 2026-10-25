/** Optimized thumbnail through Next's image endpoint (384 is one of the default image sizes). */
export const thumbUrl = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75`;
