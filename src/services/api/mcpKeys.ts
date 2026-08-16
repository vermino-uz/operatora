import { apiFetch } from "@/services/api/client";
import type { McpApiKey, McpApiKeyCreated, McpScope } from "@/features/mcp-keys/types";

/** `/mcp-keys/*` — see `features/mcp-keys/types.ts` for the confirmed contract. */
export const mcpKeysApi = {
  async list(): Promise<McpApiKey[]> {
    const data = await apiFetch<McpApiKey[]>("/mcp-keys");
    return Array.isArray(data) ? data : [];
  },

  async create(input: { name: string; scopes: McpScope[] }): Promise<McpApiKeyCreated> {
    return apiFetch("/mcp-keys", { method: "POST", body: input });
  },

  async revoke(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/mcp-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
