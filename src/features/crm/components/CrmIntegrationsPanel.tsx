"use client";

import { useState } from "react";
import { Tabs } from "@heroui/react";

import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { AmocrmPanel } from "@/features/crm/components/AmocrmPanel";
import { BitrixTildaPanel } from "@/features/crm/components/BitrixTildaPanel";

type TabId = "amocrm" | "bitrix-tilda";

/**
 * `crm-integrations` — see `features/crm/types.ts` for the full contract
 * trace. Two unrelated backend modules, matching the old frontend's
 * `Settings.tsx` (`BitrixIntegrationSettings` + `AmocrmIntegrationSettings`)
 * — kept as separate providers, not merged into one form, but now split
 * into `Tabs` sections (matching Billing's tab pattern) instead of a single
 * stacked list.
 */
export function CrmIntegrationsPanel() {
  const [tab, setTab] = useState<TabId>("amocrm");

  return (
    <SettingsSectionShell
      title="CRM Integration"
      subtitle="Connect Tilda, amoCRM and Bitrix24 — inbound webhooks and field mapping."
    >
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabId)}>
        <Tabs.List>
          <Tabs.Tab id="amocrm">amoCRM</Tabs.Tab>
          <Tabs.Tab id="bitrix-tilda">Bitrix24 / Tilda</Tabs.Tab>
        </Tabs.List>

        <div className="pt-5">
          <Tabs.Panel id="amocrm">
            <AmocrmPanel />
          </Tabs.Panel>
          <Tabs.Panel id="bitrix-tilda">
            <BitrixTildaPanel />
          </Tabs.Panel>
        </div>
      </Tabs>
    </SettingsSectionShell>
  );
}
