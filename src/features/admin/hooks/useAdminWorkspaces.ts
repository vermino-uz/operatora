import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminWorkspacesApi } from "@/services/api/admin/workspaces";
import type { UpdateWorkspacePatch, WorkspaceEntitlementsPatch, WorkspacesFilters } from "@/features/admin/types";

const LIST_KEY = ["admin", "workspaces"] as const;

export function useAdminWorkspacesListQuery(filters: WorkspacesFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => adminWorkspacesApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminWorkspaceQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "detail", id],
    queryFn: () => adminWorkspacesApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminWorkspaceUsersQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "users", id],
    queryFn: () => adminWorkspacesApi.users(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminWorkspaceLeadsQuery(id: string | undefined, page = 1) {
  return useQuery({
    queryKey: [...LIST_KEY, "leads", id, page],
    queryFn: () => adminWorkspacesApi.leads(id as string, page),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

export function useAdminWorkspaceConversationsQuery(id: string | undefined, page = 1) {
  return useQuery({
    queryKey: [...LIST_KEY, "conversations", id, page],
    queryFn: () => adminWorkspacesApi.conversations(id as string, page),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

export function useAdminWorkspaceIntegrationsQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "integrations", id],
    queryFn: () => adminWorkspacesApi.integrations(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminWorkspaceBillingQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "billing", id],
    queryFn: () => adminWorkspacesApi.billing(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminWorkspaceEntitlementsQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "entitlements", id],
    queryFn: () => adminWorkspacesApi.entitlements(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateWorkspace() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    if (id) {
      qc.invalidateQueries({ queryKey: [...LIST_KEY, "detail", id] });
      qc.invalidateQueries({ queryKey: [...LIST_KEY, "billing", id] });
      qc.invalidateQueries({ queryKey: [...LIST_KEY, "entitlements", id] });
    }
  };
}

export function useUpdateAdminWorkspaceMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateWorkspacePatch }) => adminWorkspacesApi.update(id, patch),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useSuspendAdminWorkspaceMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminWorkspacesApi.suspend(id, reason),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useReactivateAdminWorkspaceMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => adminWorkspacesApi.reactivate(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useExtendAdminTrialMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => adminWorkspacesApi.extendTrial(id, days),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useExtendAdminSubscriptionMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => adminWorkspacesApi.extendSubscription(id, days),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useExpireAdminTariffMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => adminWorkspacesApi.expireTariff(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useRevokeAdminTariffMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: (id: string) => adminWorkspacesApi.revokeTariff(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useDeleteAdminWorkspaceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminWorkspacesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateAdminWorkspaceEntitlementsMutation() {
  const invalidate = useInvalidateWorkspace();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: WorkspaceEntitlementsPatch }) =>
      adminWorkspacesApi.updateEntitlements(id, patch),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}
