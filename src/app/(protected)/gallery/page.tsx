"use client";

import { GalleryPageContent } from "@/features/gallery/components/GalleryPageContent";

/** `/gallery` — no page-level permission gate, matching the old app's
 * bare `<ProtectedRoute>` (auth-only) for this route. See
 * `GalleryPageContent`'s doc comment for the full backend trace. */
export default function GalleryPage() {
  return <GalleryPageContent />;
}
