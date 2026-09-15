import { dbProxyQuery } from "@/services/api/db-proxy";
import type { ContentIdeaInput, ContentIdeaRow, SavedContentIdeaRow } from "@/features/social-media-advisor/types";

const TABLE = "content_ideas";

/** See `features/social-media-advisor/types.ts` for the confirmed
 * contract. `workspace_id`/`writeRoles: MANAGER_ROLES` enforced
 * server-side from the JWT — never sent explicitly. */
export const contentIdeasApi = {
  async list(): Promise<ContentIdeaRow[]> {
    const rows = await dbProxyQuery<ContentIdeaRow[]>(TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return rows ?? [];
  },

  async create(input: ContentIdeaInput): Promise<ContentIdeaRow> {
    const rows = await dbProxyQuery<ContentIdeaRow[]>(TABLE, {
      method: "insert",
      values: [
        {
          title: input.title,
          description: input.description,
          platform: input.platform,
          format: input.format,
          hashtags: input.hashtags,
          topics: input.topics,
          impact_score: input.impact_score,
          status: "active",
        },
      ],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Create didn't return a row");
    return row;
  },

  async setStatus(id: string, status: "active" | "done"): Promise<ContentIdeaRow> {
    const rows = await dbProxyQuery<ContentIdeaRow[]>(TABLE, {
      method: "update",
      filters: [{ column: "id", op: "eq", value: id }],
      values: { status, updated_at: new Date().toISOString() },
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Update didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<ContentIdeaRow[]>(TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },
};

const SAVED_TABLE = "saved_content_ideas";

export const savedContentIdeasApi = {
  /** The proxy's `scope: 'user'` rule already confines this to the
   * caller's own rows server-side — no extra filter needed. */
  async list(): Promise<SavedContentIdeaRow[]> {
    const rows = await dbProxyQuery<SavedContentIdeaRow[]>(SAVED_TABLE, {
      method: "select",
      select: "*",
      order: [{ column: "created_at", ascending: false }],
    });
    return rows ?? [];
  },

  /** Mirrors the old `ContentIdeasList.tsx#saveIdea` insert exactly (same
   * fields copied, `original_idea_id` back-reference) — `user_id` is
   * auto-injected server-side from the JWT by the `scope: 'user'` rule,
   * not sent here. */
  async save(idea: ContentIdeaRow): Promise<SavedContentIdeaRow> {
    const rows = await dbProxyQuery<SavedContentIdeaRow[]>(SAVED_TABLE, {
      method: "insert",
      values: [
        {
          title: idea.title,
          description: idea.description,
          platform: idea.platform,
          format: idea.format,
          impact_score: idea.impact_score,
          hashtags: idea.hashtags,
          topics: idea.topics,
          original_idea_id: idea.id,
        },
      ],
      returning: "representation",
    });
    const row = rows?.[0];
    if (!row) throw new Error("Save didn't return a row");
    return row;
  },

  async remove(id: string): Promise<void> {
    await dbProxyQuery<SavedContentIdeaRow[]>(SAVED_TABLE, {
      method: "delete",
      filters: [{ column: "id", op: "eq", value: id }],
    });
  },
};
