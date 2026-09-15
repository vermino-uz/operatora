"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin console's own in-page nav — ports the old app's `AdminSidebar.tsx`
 * item list/order (same 14 destinations, Analytics + Agent feedback
 * included since both are real/live, see PROGRESS.md Phase 2l). This repo's
 * `AdminLayout` reuses the main `AppShell` (icon-rail sidebar for the
 * regular app, not admin-specific — see `app/(admin)/admin/layout.tsx`), so
 * the admin section needs its own lightweight sub-nav rendered inside the
 * page content instead of a second full sidebar.
 */
const ITEMS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/workspaces", label: "Workspaces" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/ai-usage", label: "AI & Usage" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/tariffs", label: "Tariffs" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/ai-feedback", label: "Agent feedback" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/notifications", label: "Send notification" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-divider pb-2">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${
              active ? "bg-foreground/10 font-medium text-foreground" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
