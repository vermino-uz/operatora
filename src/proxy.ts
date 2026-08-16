import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";

/**
 * Route protection pre-check. This is a UX optimization only, NOT the
 * authorization boundary: the real Bearer access token lives in
 * localStorage (see ARCHITECTURE.md Open Question #1 — Bearer auth, not
 * cookies), which the edge runtime cannot read. `auth-hint` is a
 * non-sensitive, non-httpOnly cookie written by `token-storage.ts`
 * alongside the real tokens purely so this proxy can redirect before
 * any protected UI flashes on screen. Every actual API request still
 * carries — and the backend still fully re-validates — the real
 * Authorization header regardless of what this proxy decides — the
 * client-side `(protected)/layout.tsx` guard (a real `/api/auth/me` call)
 * is the actual boundary and applies regardless of anything below.
 *
 * Derived from `ROUTES` (itself derived from `constants/sitemap.ts`) so a
 * new sidebar page is automatically protected here without editing this
 * file — a route was previously missed this way (`/conversations` shipped
 * without ever being added to a hand-maintained prefix list here), so this
 * list is generated instead of hand-kept in sync.
 */
const PROTECTED_PREFIXES = [...new Set(Object.values(ROUTES))].filter(
  (path) => path !== ROUTES.login,
);
const AUTH_PREFIXES = [ROUTES.login];

export function proxy(request: NextRequest) {
  const hasAuthHint = request.cookies.get("auth-hint")?.value === "1";
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !hasAuthHint) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasAuthHint) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Negative match: run on every route except static assets/api/images —
  // avoids needing to hand-list every protected path here (see above).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
