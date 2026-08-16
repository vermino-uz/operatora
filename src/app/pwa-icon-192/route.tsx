import { ImageResponse } from "next/og";

const ACCENT = "#d76700";

// Dedicated route (not the special `icon.tsx` file convention — that only
// generates one size) so `manifest.ts` has a stable, explicitly-sized URL
// to point at. Chrome's install-eligibility check wants at least a 192x192
// icon in the manifest.
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
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        O
      </div>
    ),
    { width: 192, height: 192 },
  );
}
