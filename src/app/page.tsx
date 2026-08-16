import { redirect } from "next/navigation";

/**
 * Root route has no UI of its own — the (protected) layout's client-side
 * guard decides whether the visitor lands on /dashboard or is bounced to
 * /login (see proxy.ts for the fast, cookie-hint-based redirect that
 * avoids a flash of protected content before that guard runs).
 */
export default function RootPage() {
  redirect("/dashboard");
}
