/**
 * Social Media Advisor (`/social-media-advisor`) — reference: old
 * frontend's `pages/SocialMediaAdvisor.tsx` +
 * `components/social-media/*`.
 *
 * **Confirmed backend gap, not worked around**: the old page's two core
 * actions — "Analyze Conversations" (`wordFrequency`/`topTopics`
 * extraction over the workspace's conversation history) and "Generate
 * Content Ideas" (turning those topics into AI-drafted post ideas) — were
 * a Supabase edge function (`social-media-advisor`) called with
 * `{action: 'analyze_conversations' | 'generate_content_ideas' |
 * 'get_content_ideas', data}`. On this backend, `social-media-advisor` is
 * registered `status: 'inline'` in `functions.registry.ts`, but the inline
 * handler (`functions.handlers.ts#aiChatHandler('social-media', body,
 * user)`) is the same **generic** unified chat dispatcher used for every
 * other AI-chat edge function — it only reads `body.message`/`body.prompt`
 * and calls `AiChatService.chat()`, which throws a 400
 * (`BadRequestException('message majburiy')`) if `message` is empty. The
 * old frontend's `{action, data}` payload shape is never inspected at all.
 * There is also no `wordFrequency`/`topTopics` computation anywhere in the
 * backend source (grepped the full tree — zero matches), so
 * "analyze conversations → auto-generate ideas" is not implemented
 * server-side in a form this rebuild can call, independent of anything
 * built here. Per the "flag gaps, don't fake them" rule: this page does
 * **not** offer "Analyze Conversations" or "Generate Content Ideas from
 * topics" buttons — those are dropped, not faked with client-side
 * word-counting or hardcoded ideas.
 *
 * What IS real and built here:
 * 1. An **AI Advisor chat** — `social-media-advisor` mode really works as
 *    a free-text chat (`{message}` → `{reply}`, `AiChatService`'s
 *    `MODE_CONFIG['social-media']`: "post ideas, captions, hashtags,
 *    schedule advice"). See `services/api/socialMediaAdvisor.ts`.
 * 2. A **Content Ideas** manager over the real `content_ideas` table
 *    (`table-registry.ts`: `{ scope: 'workspace', writeRoles:
 *    MANAGER_ROLES }`) — manual create/edit/delete/mark-done, same
 *    sanctioned db-proxy escape hatch as `instructions`/`canned_responses`.
 * 3. **Save/bookmark** into `saved_content_ideas` (`{ scope: 'user',
 *    writeRoles: ALL_APP_ROLES }`) — a real, server-enforced per-user
 *    bookmark list, mirroring the old `ContentIdeasList.tsx`'s "Save"
 *    action exactly (same fields copied, `original_idea_id` back-reference).
 *
 * Dropped as out of scope for this pass (real tables exist —
 * `content_plans`/`content_plan_items`/`content_plan_rows`/
 * `content_calendar`/`content_items` — but the old UI for them
 * (`SimplifiedPlansManager`, weekly planner grid, content calendar,
 * content-item generation pipeline) is a large, separate surface not
 * requested in this phase's brief; flagged here rather than built as a
 * rushed partial port).
 */

export type ContentIdeaStatus = "active" | "done";

export interface ContentIdeaRow {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  platform: string;
  format: string;
  impact_score: number;
  hashtags: string[];
  topics: string[];
  status: ContentIdeaStatus | string;
  notes?: string | null;
  version?: number;
  created_at: string;
  updated_at?: string;
}

export interface ContentIdeaInput {
  title: string;
  description: string;
  platform: string;
  format: string;
  hashtags: string[];
  topics: string[];
  impact_score: number;
}

export interface SavedContentIdeaRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  platform: string;
  format: string;
  impact_score: number;
  hashtags: string[];
  topics: string[];
  original_idea_id: string | null;
  created_at: string;
}

export const CONTENT_PLATFORMS = ["instagram", "tiktok", "youtube", "linkedin"] as const;
export const CONTENT_FORMATS = ["short_video", "long_video", "carousel", "blog"] as const;
