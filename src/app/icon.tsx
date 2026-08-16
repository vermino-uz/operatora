import { ImageResponse } from "next/og";

// Matches the theme's --accent token (globals.css "HeroUI Pro Theme" block)
// — a static app icon uses the brand color, not --foreground/--background
// (those are page-content colors, not identity), so it doesn't need to be
// light/dark-reactive the way in-page UI is.
const ACCENT = "#d76700";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          color: "white",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        O
      </div>
    ),
    { ...size },
  );
}
