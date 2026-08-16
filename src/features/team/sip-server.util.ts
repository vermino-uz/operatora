/** Ported verbatim from the old frontend's `lib/sip-server.util.ts` —
 * normalizes free-form SIP server input (URL, host:port, wss://...) down to
 * a bare hostname, matching what the backend's `UpsertOperatorSipDto`
 * expects and what the old UI always displayed. */
export function normalizeSipServerHost(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).hostname;
    } catch {
      s = s.replace(/^https?:\/\//i, "");
    }
  }

  s = s.replace(/^wss?:\/\//i, "");
  const host = s.split("/")[0]?.split(":")[0] ?? "";
  return host.trim();
}
