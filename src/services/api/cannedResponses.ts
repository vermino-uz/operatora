import { dbProxyQuery } from "@/services/api/db-proxy";
import type { CannedResponseInput, CannedResponseRow } from "@/features/canned-responses/types";

const TABLE = "canned_responses";

export const cannedResponsesApi = {
  /** `workspace_id`/`user_id` scoping is enforced server-side from the JWT
   * by the db-proxy's `table-registry.ts` rule (`scope: 'workspace'`) —
   * never sent explicitly, same as every other proxied read here. */
  async list(): Promise<CannedResponseRow[]> {
    const rows = await dbProxyQuery<CannedResponseRow[]>(TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "display_order", ascending: true }],
    });
    return rows ?? [];
  },

  async create(input: CannedResponseInput, displayOrder: number, createdBy: string | null): Promise<CannedResponseRow> {
    // `values` sent as a 1-element array (not a bare object) so the proxy's
    // insert response shape is consistently `data: rows[]` — a bare object
    // would make `db-proxy.service.ts`'s insert path return a single row
    // (not an array) instead, which this client always types as an array.
    const rows = await dbProxyQuery<CannedResponseRow[]>(TABLE, {
      method: "insert",
      values: [
        {
          shortcut: input.shortcut,
          body: input.body,
          channels: input.channels,
          is_active: input.is_active,
          display_order: displayOrder,
          created_by: createdBy,
        },
      ],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  async update(id: string, input: CannedResponseInput): Promise<CannedResponseRow> {
    const rows = await dbProxyQuery<CannedResponseRow[]>(TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: {
        shortcut: input.shortcut,
        body: input.body,
        channels: input.channels,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<CannedResponseRow[]>(TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },
};
