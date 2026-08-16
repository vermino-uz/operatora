/**
 * Claude / ChatGPT settings section — MCP API key management, `/mcp-keys/*`.
 *
 * Traced from the old frontend: the settings-sitemap entry for this section
 * ("Claude/ChatGPT ulanishi") actually renders `McpKeysManager.tsx`
 * (`src/pages/Settings.tsx` case `"claude-chatgpt": return <McpKeysManager />`),
 * NOT `AiModelSettings.tsx` — that second component (a model/temperature/
 * max-tokens form) exists in the old codebase but is dead code, never
 * imported/routed anywhere, every control disabled or a no-op `onChange`.
 * Confirmed via `grep` across the whole old `Settings.tsx` — no reference to
 * `AiModelSettings` at all.
 *
 * This is NOT related to AI Chat's `useModelsQuery`/model picker
 * (`src/features/chat/`) — that's Operatora's own model selection for the
 * in-app chat. This section is the reverse direction: minting API keys so
 * EXTERNAL AI clients (Claude Code, Claude Desktop, ChatGPT via MCP, Codex)
 * can connect INTO Operatora's data over the Model Context Protocol.
 *
 * Backend: `backend/src/mcp/api-keys.controller.ts` (`ApiKeysController`,
 * `@Controller('mcp-keys')`, JWT-guarded, no extra owner/admin gate — any
 * authenticated workspace member may mint/list/revoke; a minted key
 * inherits the creator's own roles server-side and can never exceed them).
 * - `GET /mcp-keys` -> `ApiKeyRow[]` (bare array, no pagination envelope)
 * - `POST /mcp-keys` `{ name?, scopes?: string[] }` -> `MintedKey & { warning }`
 *   (raw secret shown ONCE, never retrievable again after this response)
 * - `DELETE /mcp-keys/:id` -> `{ ok: boolean }`
 *
 * `workspace_id` is never sent — the backend derives the workspace from the
 * caller's JWT (`user.workspaceId`), confirmed directly in the controller.
 */

/** `read` is always implicitly granted; `write` implies `read`, `send`
 * implies `write` — enforced server-side in `ApiKeyService.normalizeScopes`. */
export type McpScope = "read" | "write" | "send";

export interface McpApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: McpScope[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Returned only once, at creation — `raw` can never be fetched again. */
export interface McpApiKeyCreated {
  id: string;
  raw: string;
  prefix: string;
  name: string;
  scopes: McpScope[];
  createdAt: string;
  warning?: string;
}

export const MCP_SCOPE_OPTIONS: { value: McpScope; label: string; hint: string }[] = [
  { value: "read", label: "Read only", hint: "View leads, conversations, and workspace data." },
  { value: "write", label: "Read & write", hint: "Also create/update leads and workspace data." },
  { value: "send", label: "Read, write & send", hint: "Also send outbound messages to customers." },
];
