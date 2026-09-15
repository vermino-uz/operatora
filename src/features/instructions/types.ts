/**
 * Instructions (`/instructions`) — reference: old frontend's `pages/
 * Instructions.tsx`. Reads/writes the `instructions` table via
 * `supabase.from('instructions')`, routed on this backend through the same
 * sanctioned "no dedicated REST controller" escape hatch already used for
 * `canned_responses` (`services/api/cannedResponses.ts`) and the operator
 * self-feedback tables (`services/api/operatorFeedbackSelf.ts`): the generic
 * `POST /db/:table/query` proxy. Confirmed in `table-registry.ts`:
 * `{ table: 'instructions', scope: 'workspace', writeRoles: MANAGER_ROLES }`
 * — no dedicated `InstructionsController` exists anywhere under
 * `dev.operatora/app/backend/src/` (grepped for "instruction" across the
 * whole backend source tree).
 */

export interface InstructionRow {
  id: string;
  workspace_id: string;
  title: string;
  category: string;
  priority: "high" | "medium" | "low" | string;
  target_operators: string[];
  linked_conversations: number;
  created_by: string | null;
  created_at: string;
  content: string;
  tags: string[];
  effectiveness: number;
  usage_count: number;
  updated_at: string;
  display_order: number;
}

export interface InstructionInput {
  title: string;
  category: string;
  priority: string;
  target_operators: string[];
  tags: string[];
  content: string;
  created_by: string | null;
}

export const INSTRUCTION_CATEGORIES = [
  "Sales Techniques",
  "Product Knowledge",
  "Communication",
  "Competitive Intelligence",
  "AI Mentor",
] as const;

export const INSTRUCTION_PRIORITIES = ["high", "medium", "low"] as const;

/** `quick_links` — same page, "Quick Links" tab in the old UI
 * (`QuickLinksManager.tsx`). Also `db-proxy`-only:
 * `{ table: 'quick_links', scope: 'workspace', writeRoles: MANAGER_ROLES }`. */
export interface QuickLinkRow {
  id: string;
  workspace_id: string;
  title: string;
  url: string;
  display_order: number;
  created_at: string;
}

export interface QuickLinkInput {
  title: string;
  url: string;
}
