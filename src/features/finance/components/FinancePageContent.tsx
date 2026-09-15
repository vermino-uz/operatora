"use client";

import { useState } from "react";
import { Tabs } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { ErrorState } from "@/components/shared/ErrorState";
import { FinanceAnalyticsTab } from "@/features/finance/components/FinanceAnalyticsTab";
import { CoursesTab } from "@/features/finance/components/CoursesTab";
import { GroupsTab } from "@/features/finance/components/GroupsTab";
import { PaymentsTab } from "@/features/finance/components/PaymentsTab";
import { ExpensesTab } from "@/features/finance/components/ExpensesTab";
import { AuditLogTab } from "@/features/finance/components/AuditLogTab";

type TabId = "analytics" | "courses" | "groups" | "payments" | "expenses" | "audit";

/**
 * `/finance` — workspace tuition-business back-office. See
 * `features/finance/types.ts`'s doc comment for the full backend trace and
 * for how this differs from `billing` settings.
 *
 * Deliberately dropped from this pass, not silently rolled in (real tables
 * exist — `sms_campaigns`/`sms_templates` — but the old page's SMS tab
 * (`SMSTab.tsx`, ~880 lines: campaign builder, audience picker across
 * groups/manual numbers, template management) is a large, separate
 * messaging sub-feature that would duplicate this app's existing
 * eskiz/lead-SMS infrastructure under a different data shape; flagging it
 * here for a dedicated pass rather than rushing a partial port). Likewise,
 * the old `GroupsTab.tsx`'s per-member monthly "billing period" grid
 * (`group_months` table: planned/active/completed month windows with
 * inline payment recording per cell) is scoped down here to plain
 * roster management (`GroupMembersModal`) + a standalone Payments tab —
 * real CRUD against the real tables, just without the old page's bespoke
 * month-grid visualization.
 */
export function FinancePageContent() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const roles = useSessionStore((s) => s.roles);
  const userId = useSessionStore((s) => s.user?.id) ?? null;
  const [tab, setTab] = useState<TabId>("analytics");

  if (!workspaceId) {
    return (
      <div className="p-6">
        <ErrorState error={new Error("No workspace selected")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-foreground/60">Courses, groups, tuition payments, and expenses for your workspace.</p>
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabId)}>
        <Tabs.List>
          <Tabs.Tab id="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab id="courses">Courses</Tabs.Tab>
          <Tabs.Tab id="groups">Groups</Tabs.Tab>
          <Tabs.Tab id="payments">Payments</Tabs.Tab>
          <Tabs.Tab id="expenses">Expenses</Tabs.Tab>
          <Tabs.Tab id="audit">Audit log</Tabs.Tab>
        </Tabs.List>

        <div className="pt-5">
          <Tabs.Panel id="analytics">
            <FinanceAnalyticsTab workspaceId={workspaceId} />
          </Tabs.Panel>
          <Tabs.Panel id="courses">
            <CoursesTab workspaceId={workspaceId} userId={userId} roles={roles} />
          </Tabs.Panel>
          <Tabs.Panel id="groups">
            <GroupsTab workspaceId={workspaceId} userId={userId} roles={roles} />
          </Tabs.Panel>
          <Tabs.Panel id="payments">
            <PaymentsTab workspaceId={workspaceId} userId={userId} roles={roles} />
          </Tabs.Panel>
          <Tabs.Panel id="expenses">
            <ExpensesTab workspaceId={workspaceId} userId={userId} roles={roles} />
          </Tabs.Panel>
          <Tabs.Panel id="audit">
            <AuditLogTab workspaceId={workspaceId} />
          </Tabs.Panel>
        </div>
      </Tabs>
    </div>
  );
}
