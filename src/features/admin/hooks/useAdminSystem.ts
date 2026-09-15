import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminSystemApi } from "@/services/api/admin/system";
import type { AiInstructionPatch, MobileAppInfo } from "@/features/admin/types";

export function useAdminSystemHealthQuery() {
  return useQuery({
    queryKey: ["admin", "system", "health"],
    queryFn: () => adminSystemApi.health(),
    staleTime: 30_000,
  });
}

export function useAdminAppInfoQuery() {
  return useQuery({
    queryKey: ["admin", "system", "app-info"],
    queryFn: () => adminSystemApi.appInfo(),
  });
}

export function useUpdateAdminAppInfoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MobileAppInfo) => adminSystemApi.updateAppInfo(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "system", "app-info"] }),
  });
}

export function useAdminAiInstructionsQuery(category?: string) {
  return useQuery({
    queryKey: ["admin", "system", "ai-instructions", category ?? null],
    queryFn: () => adminSystemApi.aiInstructions(category),
  });
}

function useInvalidateAiInstructions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin", "system", "ai-instructions"] });
}

export function useCreateAdminAiInstructionMutation() {
  const invalidate = useInvalidateAiInstructions();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      instructionText: string;
      category?: string;
      isActive?: boolean;
      priority?: number;
    }) => adminSystemApi.createAiInstruction(body),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminAiInstructionMutation() {
  const invalidate = useInvalidateAiInstructions();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AiInstructionPatch }) => adminSystemApi.updateAiInstruction(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteAdminAiInstructionMutation() {
  const invalidate = useInvalidateAiInstructions();
  return useMutation({
    mutationFn: (id: string) => adminSystemApi.removeAiInstruction(id),
    onSuccess: invalidate,
  });
}
