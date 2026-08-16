import { ImageResponse } from "next/og";

const ACCENT = "#d76700";

// See pwa-icon-192/route.tsx — the 512x512 variant Chrome uses for the
// install-confirmation dialog and splash screen.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACCENT,
          color: "white",
          fontSize: 288,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        O
      </div>
    ),
    { width: 512, height: 512 },
  );
}
