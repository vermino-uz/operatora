import type { MetadataRoute } from "next";

/** Makes the app installable (desktop and mobile Chrome) — this is what
 * actually enables a themed title bar/tab, which the plain `theme-color`
 * meta tag alone can't do in a normal (non-installed) browser tab. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Operatora",
    short_name: "Operatora",
    description: "Operatora workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcf3ef",
    theme_color: "#d76700",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
