import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clientsApi,
  coursesApi,
  expenseCategoriesApi,
  expensesApi,
  financeAuditLogsApi,
  groupsApi,
  groupUsersApi,
  paymentsApi,
} from "@/services/api/finance";

const coursesKey = (workspaceId: string | null) => ["finance", "courses", workspaceId ?? "none"] as const;
const groupsKey = (workspaceId: string | null) => ["finance", "groups", workspaceId ?? "none"] as const;
const groupUsersKey = (groupIds: string[]) => ["finance", "group-users", groupIds.slice().sort().join(",")] as const;
const clientsKey = (workspaceId: string | null) => ["finance", "clients", workspaceId ?? "none"] as const;
const paymentsKey = (groupUserIds: string[]) => ["finance", "payments", groupUserIds.slice().sort().join(",")] as const;
const expenseCategoriesKey = (workspaceId: string | null) => ["finance", "expense-categories", workspaceId ?? "none"] as const;
const expensesKey = (workspaceId: string | null) => ["finance", "expenses", workspaceId ?? "none"] as const;
const auditLogsKey = (workspaceId: string | null) => ["finance", "audit-logs", workspaceId ?? "none"] as const;

export function useCoursesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: coursesKey(workspaceId),
    queryFn: () => coursesApi.list(),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateCourseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: coursesApi.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: coursesKey(workspaceId) }),
  });
}

export function useUpdateCourseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof coursesApi.update>[1] }) => coursesApi.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: coursesKey(workspaceId) }),
  });
}

export function useDeleteCourseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coursesApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: coursesKey(workspaceId) }),
  });
}

export function useGroupsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: groupsKey(workspaceId),
    queryFn: () => groupsApi.list(),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateGroupMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupsKey(workspaceId) }),
  });
}

export function useUpdateGroupMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof groupsApi.update>[1] }) => groupsApi.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupsKey(workspaceId) }),
  });
}

export function useDeleteGroupMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupsKey(workspaceId) }),
  });
}

/** Group members for a set of groups — one request, not N (mirrors
 * `useFormSubmissionCountsQuery`'s pattern). */
export function useGroupUsersQuery(groupIds: string[]) {
  return useQuery({
    queryKey: groupUsersKey(groupIds),
    queryFn: () => groupUsersApi.listForGroups(groupIds),
    enabled: groupIds.length > 0,
    staleTime: 30_000,
  });
}

export function useAddGroupMemberMutation(groupIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: groupUsersApi.add,
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupUsersKey(groupIds) }),
  });
}

export function useUpdateGroupMemberStatusMutation(groupIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof groupUsersApi.updateStatus>[1] }) =>
      groupUsersApi.updateStatus(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupUsersKey(groupIds) }),
  });
}

export function useRemoveGroupMemberMutation(groupIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupUsersApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: groupUsersKey(groupIds) }),
  });
}

export function useClientsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: clientsKey(workspaceId),
    queryFn: () => clientsApi.list(),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateClientMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: clientsKey(workspaceId) }),
  });
}

export function usePaymentsQuery(groupUserIds: string[]) {
  return useQuery({
    queryKey: paymentsKey(groupUserIds),
    queryFn: () => paymentsApi.listForGroupUsers(groupUserIds),
    enabled: groupUserIds.length > 0,
    staleTime: 15_000,
  });
}

export function useRecordPaymentMutation(groupUserIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.record,
    onSuccess: () => void qc.invalidateQueries({ queryKey: paymentsKey(groupUserIds) }),
  });
}

export function useDeletePaymentMutation(groupUserIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: paymentsKey(groupUserIds) }),
  });
}

export function useExpenseCategoriesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: expenseCategoriesKey(workspaceId),
    queryFn: () => expenseCategoriesApi.list(),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useCreateExpenseCategoryMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseCategoriesApi.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: expenseCategoriesKey(workspaceId) }),
  });
}

export function useSetExpenseCategoryActiveMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => expenseCategoriesApi.setActive(id, isActive),
    onSuccess: () => void qc.invalidateQueries({ queryKey: expenseCategoriesKey(workspaceId) }),
  });
}

export function useExpensesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: expensesKey(workspaceId),
    queryFn: () => expensesApi.list(),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}

export function useCreateExpenseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: expensesKey(workspaceId) }),
  });
}

export function useDeleteExpenseMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: expensesKey(workspaceId) }),
  });
}

export function useFinanceAuditLogsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: auditLogsKey(workspaceId),
    queryFn: () => financeAuditLogsApi.list(),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}

export interface FinanceAnalytics {
  expectedRevenue: number;
  collectedThisMonth: number;
  outstandingThisMonth: number;
  totalActiveMembers: number;
  collectionRate: number;
  monthlyGrowth: number;
  coursePaymentsThisMonth: number;
  monthlyExpenses: number;
}

/** Ported from the old `FinanceAnalytics.tsx#useQuery` — same metrics,
 * recomputed client-side from separate scoped queries rather than the old
 * Supabase-shape relational embed (`groups!inner(*, courses!inner(*),
 * group_users!inner(*, profiles(*)))`), same "no rel join" constraint as
 * every other db-proxy-backed feature in this app. */
export function useFinanceAnalyticsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["finance", "analytics", workspaceId ?? "none"],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<FinanceAnalytics> => {
      const now = new Date();
      const currentMonth = `${now.toISOString().slice(0, 7)}-01`;
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonth = `${prev.toISOString().slice(0, 7)}-01`;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

      const [groups, courses, currentPayments, previousPayments, expenses] = await Promise.all([
        groupsApi.list(),
        coursesApi.list(),
        paymentsApi.listByMonth(currentMonth),
        paymentsApi.listByMonth(previousMonth),
        expensesApi.listByDateRange(monthStart, monthEnd),
      ]);

      const activeGroups = groups.filter((g) => g.is_active);
      const groupUsers = await groupUsersApi.listForGroups(activeGroups.map((g) => g.id));
      const activeMembers = groupUsers.filter((gu) => gu.status === "active");
      const courseById = new Map(courses.map((c) => [c.id, c]));
      const groupById = new Map(activeGroups.map((g) => [g.id, g]));

      const coursePayments = currentPayments.filter((p) => p.is_course_payment);
      const regularPayments = currentPayments.filter((p) => !p.is_course_payment);
      const previousRegularPayments = previousPayments.filter((p) => !p.is_course_payment);
      const activeCoursePayers = new Set(
        coursePayments.filter((p) => !p.payment_completion_date || new Date(p.payment_completion_date) > now).map((p) => p.group_user_id),
      );

      let expectedRevenue = 0;
      for (const gu of activeMembers) {
        if (activeCoursePayers.has(gu.id)) continue;
        const group = groupById.get(gu.group_id);
        const course = group ? courseById.get(group.course_id) : undefined;
        expectedRevenue += gu.monthly_amount_override ?? course?.monthly_tuition ?? 0;
      }

      const collectedThisMonth = regularPayments.reduce((sum, p) => sum + p.amount, 0);
      const coursePaymentsThisMonth = coursePayments.reduce((sum, p) => sum + p.amount, 0);
      const collectedPreviousMonth = previousRegularPayments.reduce((sum, p) => sum + p.amount, 0);
      const monthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const outstandingThisMonth = Math.max(0, expectedRevenue - collectedThisMonth);
      const collectionRate = expectedRevenue > 0 ? (collectedThisMonth / expectedRevenue) * 100 : 0;
      const monthlyGrowth =
        collectedPreviousMonth > 0
          ? ((collectedThisMonth - collectedPreviousMonth) / collectedPreviousMonth) * 100
          : collectedThisMonth > 0
            ? 100
            : 0;

      return {
        expectedRevenue,
        collectedThisMonth,
        outstandingThisMonth,
        totalActiveMembers: activeMembers.length,
        collectionRate,
        monthlyGrowth,
        coursePaymentsThisMonth,
        monthlyExpenses,
      };
    },
  });
}
