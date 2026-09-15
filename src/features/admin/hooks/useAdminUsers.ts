import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "@/services/api/admin/users";
import type { UpdateUserPatch, UsersFilters } from "@/features/admin/types";

const LIST_KEY = ["admin", "users"] as const;

export function useAdminUsersListQuery(filters: UsersFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => adminUsersApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "detail", id],
    queryFn: () => adminUsersApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useAdminUserSessionsQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...LIST_KEY, "sessions", id],
    queryFn: () => adminUsersApi.sessions(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateAdminUser() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: LIST_KEY });
    if (id) qc.invalidateQueries({ queryKey: [...LIST_KEY, "detail", id] });
  };
}

export function useUpdateAdminUserMutation() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserPatch }) => adminUsersApi.update(id, patch),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useDeleteAdminUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useLockAdminUserMutation() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminUsersApi.lock(id, reason),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export function useUnlockAdminUserMutation() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.unlock(id),
    onSuccess: (_d, id) => invalidate(id),
  });
}

export function useRevokeAllAdminUserSessionsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.revokeAllSessions(id),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: [...LIST_KEY, "sessions", id] }),
  });
}

export function useRevokeAdminUserSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      adminUsersApi.revokeSession(userId, sessionId),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...LIST_KEY, "sessions", v.userId] }),
  });
}

export function useAddAdminUserRoleMutation() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminUsersApi.addRole(userId, role),
    onSuccess: (_d, v) => invalidate(v.userId),
  });
}

export function useRemoveAdminUserRoleMutation() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminUsersApi.removeRole(userId, role),
    onSuccess: (_d, v) => invalidate(v.userId),
  });
}

export function useImpersonateAdminUserMutation() {
  return useMutation({
    mutationFn: (userId: string) => adminUsersApi.impersonate(userId),
  });
}
