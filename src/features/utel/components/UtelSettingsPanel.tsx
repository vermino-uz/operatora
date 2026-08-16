"use client";

import { useSessionStore } from "@/state/session-store";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmsGatewayPanel } from "@/features/team/components/sip/SmsGatewayPanel";

/**
 * Utel Integration — traced from the old frontend's `UtelSettings.tsx`:
 *
 *   export function UtelSettings() {
 *     return <TelephonySmsGateways />; // "uses SMS gateway UI until
 *                                      //  dedicated Utel module exists"
 *   }
 *
 * i.e. in the OLD frontend this section has no Utel-specific fields at
 * all — it's literally the generic `/api/sms-gateways` CRUD (the exact
 * same contract Team Members' per-operator SMS gateway tab already uses
 * here, see `features/team/components/sip/SmsGatewayPanel.tsx`), called
 * for the logged-in user themselves (no `user_id` override — confirmed by
 * reading `TelephonySmsGateways.tsx` directly, it never passes one, and
 * `sms-gateways.controller.ts`'s `resolveUserId()` falls back to the
 * caller's own id when none is supplied). Reproduced 1:1 here by reusing
 * `SmsGatewayPanel` with the current user's own id — no new service layer
 * needed, this *is* the same contract, not a lookalike.
 *
 * A genuinely separate, Utel-branded backend integration DOES exist
 * (`backend/src/ai-ext/utel/utel.service.ts`, dispatched via
 * `POST /api/fn/utel-auth` / `utel-call-history` / `utel-sync-conversations`)
 * — login/password auth against Utel's telephony API, call-history pull,
 * and conversation sync. It is **not built here**: its `auth()` method
 * writes raw SQL against columns (`workspace_id`, `provider`, `config`)
 * that do not exist on the real `external_api_config` table (confirmed
 * against `backend/prisma/schema.prisma`'s actual model — that table only
 * has `api_name`/`base_url`/`email`/`encrypted_password`/`api_token`/etc.,
 * no `workspace_id` or `provider` column, and no migration adds them). The
 * service also isn't referenced by any settings UI in the old frontend —
 * it's dead/unreachable code there too. Calling it would hit a "column
 * does not exist" 500 from Postgres, not a real working feature, so no
 * connect/call-history/sync UI was built against it — that would be
 * fabricating a contract, which the project rules explicitly forbid.
 */
export function UtelSettingsPanel() {
  const userId = useSessionStore((s) => s.user?.id ?? null);

  const shellProps = {
    title: "Utel Integration",
    subtitle: "Outbound SMS gateway settings for Utel telephony/SMS traffic (your own connection).",
  } as const;

  if (!userId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <EmptyState title="Not signed in" description="Sign in to manage your SMS gateway settings." />
      </SettingsSectionShell>
    );
  }

  return (
    <SettingsSectionShell {...shellProps} wide>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/60">
          Configure the outbound gateway used for Utel SMS/telephony traffic. This is the same
          generic SMS gateway connection used elsewhere in Operatora — provider name, sender/login,
          and SMS port for your own account.
        </p>
        <SmsGatewayPanel userId={userId} enabled />
      </div>
    </SettingsSectionShell>
  );
}
