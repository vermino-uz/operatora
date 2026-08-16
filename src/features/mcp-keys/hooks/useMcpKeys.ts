import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mcpKeysApi } from "@/services/api/mcpKeys";
import type { McpScope } from "@/features/mcp-keys/types";

const MCP_KEYS_QUERY_KEY = ["mcp-keys"] as const;

export function useMcpKeysQuery() {
  return useQuery({
    queryKey: MCP_KEYS_QUERY_KEY,
    queryFn: mcpKeysApi.list,
    staleTime: 15_000,
  });
}

export function useCreateMcpKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; scopes: McpScope[] }) => mcpKeysApi.create(vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MCP_KEYS_QUERY_KEY });
    },
  });
}

export function useRevokeMcpKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mcpKeysApi.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MCP_KEYS_QUERY_KEY });
    },
  });
}
