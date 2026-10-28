import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// Link previews (Open Graph images): a bench photo with a line of text over it, rendered at build time.
// Sync reads on purpose: async file reads would stop Next.js prerendering these.
export const shareSize = { width: 1200, height: 630 };

const font = readFileSync(path.join(process.cwd(), "assets", "Newsreader.ttf"));

export async function shareImage({ photo, kicker, title }: { photo: string; kicker: string; title: string }) {
  const jpeg = readFileSync(path.join(process.cwd(), "public", photo));
  const src = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#142326" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not the page */}
        <img src={src} alt="" width={shareSize.width} height={shareSize.height} style={{ objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "140px 56px 44px",
            backgroundImage: "linear-gradient(to bottom, rgba(20,35,38,0), rgba(20,35,38,0.85))",
            color: "#f4f5ef",
          }}
        >
          <div style={{ fontSize: 30, opacity: 0.85 }}>{kicker}</div>
          <div style={{ fontSize: 68, lineHeight: 1.05, marginTop: 6 }}>{title}</div>
        </div>
      </div>
    ),
    { ...shareSize, fonts: [{ name: "Newsreader", data: font, style: "normal", weight: 400 }] },
  );
}
