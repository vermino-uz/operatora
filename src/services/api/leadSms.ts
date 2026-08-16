import { dbProxyQuery } from "@/services/api/db-proxy";
import type { LeadSmsMessage } from "@/features/leads/types";

/**
 * Lead SMS tab (Phase 2c-4) — read-only sent-message log with delivery
 * status. Deliberately reads the local `lead_sms_messages` table via the
 * db-proxy (registered `scope: 'workspace', writeRoles: ALL_APP_ROLES` in
 * `table-registry.ts`) rather than `GET /sms/messages` (`sms.controller.ts`):
 * that endpoint proxies to an external, per-workspace-configured SMS
 * gateway microservice (`resolveGatewayForUser()`) whose response shape is
 * out of this backend's control and isn't traceable from the repo alone,
 * and it 400s outright when no gateway/channel port is configured for the
 * workspace. `lead_sms_messages` is the concrete local table every sent
 * message is persisted to regardless of gateway (columns confirmed directly
 * in `prisma/schema.prisma`: `status`/`sent_at`/`delivered_at`/
 * `error_message`/`provider_message_id` — exactly the delivery-status shape
 * this tab needs), and is what the backend's own AI tooling
 * (`chat-tools.service.ts`) reads for the same "history for this lead"
 * purpose. Compose (writing new rows here) is out of scope — see
 * `LeadSmsTab`'s doc comment, deferred to Phase 2c-8.
 */
const TABLE = "lead_sms_messages";
const SELECT_COLUMNS = [
  "id",
  "lead_id",
  "sender_id",
  "template_id",
  "reason_tag",
  "message_body",
  "phone_number",
  "status",
  "provider_message_id",
  "error_message",
  "sent_at",
  "delivered_at",
  "created_at",
].join(", ");

export const leadSmsApi = {
  async list(leadId: string): Promise<LeadSmsMessage[]> {
    const rows = await dbProxyQuery<LeadSmsMessage[]>(TABLE, {
      method: "select",
      select: SELECT_COLUMNS,
      filters: [{ column: "lead_id", op: "eq", value: leadId }],
      order: [{ column: "created_at", ascending: false }],
      limit: 200,
    });
    return rows ?? [];
  },
};
