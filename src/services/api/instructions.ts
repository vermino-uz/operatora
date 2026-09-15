import { dbProxyQuery } from "@/services/api/db-proxy";
import type { InstructionInput, InstructionRow, QuickLinkInput, QuickLinkRow } from "@/features/instructions/types";

const TABLE = "instructions";

/** See `features/instructions/types.ts` for the confirmed contract. Both
 * `workspace_id` scoping and `writeRoles: MANAGER_ROLES` are enforced
 * server-side from the JWT by the db-proxy — never sent explicitly. */
export const instructionsApi = {
  async list(): Promise<InstructionRow[]> {
    const rows = await dbProxyQuery<InstructionRow[]>(TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "display_order", ascending: true }],
    });
    return rows ?? [];
  },

  async create(input: InstructionInput, displayOrder: number): Promise<InstructionRow> {
    const rows = await dbProxyQuery<InstructionRow[]>(TABLE, {
      method: "insert",
      values: [
        {
          title: input.title,
          category: input.category,
          priority: input.priority,
          target_operators: input.target_operators,
          tags: input.tags,
          content: input.content,
          created_by: input.created_by,
          display_order: displayOrder,
          linked_conversations: 0,
          effectiveness: 0,
          usage_count: 0,
        },
      ],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  async update(id: string, input: InstructionInput): Promise<InstructionRow> {
    const rows = await dbProxyQuery<InstructionRow[]>(TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: {
        title: input.title,
        category: input.category,
        priority: input.priority,
        target_operators: input.target_operators,
        tags: input.tags,
        content: input.content,
        updated_at: new Date().toISOString(),
      },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<InstructionRow[]>(TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },

  /** Persists a full re-ordering pass (one `display_order` update per row,
   * mirroring the old page's `reorderMutation`). Sequential, not
   * `Promise.all` — the old frontend fired all updates concurrently, but
   * since this rebuild's guidance is to avoid unnecessary parallel-mutation
   * flooding against a single small table, and order doesn't matter for
   * correctness here (each row targets a distinct id), either is safe; kept
   * sequential for simplicity and to bound in-flight requests. */
  async reorder(rows: { id: string; display_order: number }[]): Promise<void> {
    for (const row of rows) {
      await dbProxyQuery<InstructionRow[]>(TABLE, {
        method: "update",
        filters: [{ column: "id", op: "eq", value: row.id }],
        values: { display_order: row.display_order },
      });
    }
  },
};

const QUICK_LINKS_TABLE = "quick_links";

export const quickLinksApi = {
  async list(): Promise<QuickLinkRow[]> {
    const rows = await dbProxyQuery<QuickLinkRow[]>(QUICK_LINKS_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "display_order", ascending: true }],
    });
    return rows ?? [];
  },

  async create(input: QuickLinkInput, displayOrder: number): Promise<QuickLinkRow> {
    const rows = await dbProxyQuery<QuickLinkRow[]>(QUICK_LINKS_TABLE, {
      method: "insert",
      values: [{ title: input.title, url: input.url, display_order: displayOrder }],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<QuickLinkRow[]>(QUICK_LINKS_TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },
};
