/**
 * Shared centered-popup opener for OAuth connect flows — extracted from
 * Instagram's `openInstagramOAuthPopup` (same dimensions/centering math) so
 * Google Calendar and Google Sheets don't each duplicate it. Named
 * per-caller via `windowName` so multiple OAuth popups (e.g. connecting two
 * different integrations in two tabs) don't clobber each other.
 */
export function openOAuthPopup(authUrl: string, windowName: string): Window | null {
  const w = 560;
  const h = 720;
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const left = Math.max(0, (screen.availLeft ?? 0) + (screen.availWidth - w) / 2);
  const top = Math.max(0, (screen.availTop ?? 0) + (screen.availHeight - h) / 2);
  const features = `popup=yes,width=${w},height=${h},left=${left},top=${top}`;
  return window.open(authUrl, windowName, features);
}
