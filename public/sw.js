// Minimal service worker — exists only so the browser recognizes this app
// as installable (Chrome's install-eligibility check). Deliberately does
// NOT cache anything or serve offline content: this app already has its
// own online/offline detection and error-state handling (see
// components/shared/ErrorState.tsx), and a caching service worker would be
// a much bigger, separate feature with its own correctness risks (stale
// bundles, cache invalidation on deploy) — out of scope here.
self.addEventListener("fetch", () => {
  // No-op: every request passes straight through to the network.
});
