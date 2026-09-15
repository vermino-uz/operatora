import { useQuery } from "@tanstack/react-query";
import { operatorsApi } from "@/services/api/operators";

/** `GET /operators-page/operators` — bare array, workspace-scoped
 * server-side from the JWT. Moderate staleTime; the operators roster
 * itself changes rarely (only via internal-number edits or new team
 * signups), unlike the conversation metrics layered on top of it. */
export function useOperatorsQuery() {
  return useQuery({
    queryKey: ["operators-page", "operators"],
    queryFn: () => operatorsApi.list(),
    staleTime: 30_000,
  });
}
