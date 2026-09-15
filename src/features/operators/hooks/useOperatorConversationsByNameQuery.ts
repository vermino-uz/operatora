import { useQuery } from "@tanstack/react-query";
import { operatorsApi } from "@/services/api/operators";

export function useOperatorConversationsByNameQuery(
  operatorName: string | null,
  aliases: { displayName?: string; storedName?: string; email?: string; fullName?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "operators-page",
      "operator-conversations",
      operatorName,
      aliases.displayName ?? null,
      aliases.storedName ?? null,
      aliases.email ?? null,
      aliases.fullName ?? null,
    ],
    queryFn: () => operatorsApi.conversationsForOperator(operatorName as string, aliases),
    enabled: enabled && Boolean(operatorName),
  });
}
