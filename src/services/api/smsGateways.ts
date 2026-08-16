import { apiFetch } from "@/services/api/client";
import type { SmsGatewayRow, UpsertSmsGatewayInput } from "@/features/team/types";

/**
 * Per-operator SMS gateways — `GET/POST/PATCH/DELETE /api/sms-gateways`,
 * scoped by a `user_id` query param (`sms-gateways.controller.ts`'s
 * `resolveUserId`, same pattern as `gsm.ts`). Traced from the old
 * frontend's `OperatorSmsGatewayPanel.tsx`.
 */
export const smsGatewaysApi = {
  async list(userId: string): Promise<SmsGatewayRow[]> {
    const data = await apiFetch<SmsGatewayRow[]>(`/sms-gateways?user_id=${encodeURIComponent(userId)}`);
    return Array.isArray(data) ? data : [];
  },

  async create(userId: string, input: UpsertSmsGatewayInput): Promise<SmsGatewayRow> {
    return apiFetch(`/sms-gateways?user_id=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: input,
    });
  },

  async update(userId: string, id: string, input: Partial<UpsertSmsGatewayInput>): Promise<SmsGatewayRow> {
    return apiFetch(`/sms-gateways/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: input,
    });
  },

  async remove(userId: string, id: string): Promise<void> {
    await apiFetch(`/sms-gateways/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  },
};
