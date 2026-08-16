"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Envelope } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeadSmsQuery } from "@/features/leads/hooks/useLeadSms";
import { useLeadEskizSmsQuery } from "@/features/leads/hooks/useEskizSms";
import { ComposeSmsDialog } from "@/features/leads/components/ComposeSmsDialog";
import type { EskizMessageStatus, LeadRow, LeadSmsStatus } from "@/features/leads/types";

function statusColor(status: LeadSmsStatus | EskizMessageStatus): string {
  switch (status) {
    case "delivered":
      return "text-success";
    case "failed":
    case "expired":
    case "rejected":
      return "text-danger";
    case "sent":
    case "waiting":
      return "text-primary";
    default:
      return "text-foreground/50";
  }
}

/** A single row shape both sources are normalized into for one merged,
 * time-ordered feed. */
interface SmsFeedRow {
  id: string;
  body: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Lead SMS tab — merges two real, independently-traced sources into one
 * time-ordered feed:
 *  - the local `lead_sms_messages` read-only log (Phase 2c-4, see
 *    `services/api/leadSms.ts` for why this table is read at all despite
 *    having no delivery pipeline behind it — kept for backward-compat with
 *    whatever wrote rows there before this pipeline existed, e.g. AI
 *    tooling);
 *  - actual Eskiz-delivered messages (Phase 2c-8's real send pipeline, see
 *    `services/api/eskizSms.ts`) for the one chat (if any) linked to this
 *    lead.
 * Compose (`ComposeSmsDialog`) sends via Eskiz and auto-links the resulting
 * chat to this lead, so a message sent from here always shows up in this
 * same feed on the next refetch.
 */
export function LeadSmsTab({ leadId, isActive, lead, operatorName }: { leadId: string; isActive: boolean; lead: LeadRow; operatorName: string }) {
  const smsQuery = useLeadSmsQuery(leadId, isActive);
  const eskizQuery = useLeadEskizSmsQuery(leadId, isActive);
  const [composeOpen, setComposeOpen] = useState(false);

  const isLoading = smsQuery.isLoading || eskizQuery.isLoading;
  const isError = smsQuery.isError || eskizQuery.isError;

  const rows: SmsFeedRow[] = [
    ...(smsQuery.data ?? []).map((m) => ({
      id: `legacy-${m.id}`,
      body: m.message_body,
      status: m.status,
      errorMessage: m.error_message,
      createdAt: m.created_at,
    })),
    ...(eskizQuery.data ?? []).map((m) => ({
      id: `eskiz-${m.id}`,
      body: m.text,
      status: m.status,
      errorMessage: m.error_message,
      createdAt: m.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onPress={() => setComposeOpen(true)}>
          <Envelope className="size-3.5" aria-hidden="true" />
          Compose SMS
        </Button>
      </div>

      {isLoading ? <LoadingState label="Loading SMS history…" /> : null}
      {isError ? (
        <ErrorState
          error={smsQuery.error ?? eskizQuery.error}
          onRetry={() => {
            void smsQuery.refetch();
            void eskizQuery.refetch();
          }}
        />
      ) : null}
      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState title="No SMS sent to this lead" description="Use Compose SMS above to send one." />
      ) : null}

      {!isLoading && !isError && rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-foreground/50">{lead.phone_number ?? "—"}</span>
                <span className={`text-xs font-medium capitalize ${statusColor(row.status)}`}>{row.status}</span>
              </div>
              <p className="whitespace-pre-wrap text-foreground/80">{row.body}</p>
              {row.errorMessage ? <p className="mt-1 text-xs text-danger">{row.errorMessage}</p> : null}
              <p className="mt-1 text-xs text-foreground/40">{new Date(row.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {composeOpen ? <ComposeSmsDialog lead={lead} operatorName={operatorName} onClose={() => setComposeOpen(false)} /> : null}
    </div>
  );
}
