import { ImageResponse } from "next/og";

// Saytın ümumi paylaşım şəkli — öz şəkli olmayan səhifələr üçün (WhatsApp və s.
// SVG göstərmir, ona görə PNG burada yaradılır).
export const alt = "tradixai — Onlayn Ticarət Platforması";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 55%, #6366f1 100%)", color: "#fff" }}>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>tradixai</div>
        <div style={{ fontSize: 40, marginTop: 12, opacity: 0.9 }}>Onlayn Ticarət Platforması</div>
        <div style={{ fontSize: 28, marginTop: 36, opacity: 0.75 }}>Al · Sat · Birlikdə daha ucuz</div>
      </div>
    ),
    size,
  );
}
