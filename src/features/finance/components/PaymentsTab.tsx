"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { FieldError } from "@/features/finance/components/RhfFieldError";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { paymentEditorSchema, type PaymentEditorValues } from "@/features/finance/schema";
import { formatUZS, monthKey } from "@/features/finance/utils";
import { canManageFinanceRecords } from "@/features/finance/permissions";
import {
  useClientsQuery,
  useDeletePaymentMutation,
  useGroupsQuery,
  useGroupUsersQuery,
  usePaymentsQuery,
  useRecordPaymentMutation,
} from "@/features/finance/hooks/useFinance";
import type { AppRole } from "@/types/entities";

const PAYMENT_TYPE_OPTIONS = [
  { id: "full", label: "Full" },
  { id: "half", label: "Half" },
  { id: "split_first", label: "Split — first half" },
  { id: "split_second", label: "Split — second half" },
  { id: "full_course", label: "Full course" },
  { id: "half_course", label: "Half course" },
];
const PAYMENT_METHOD_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "transfer", label: "Bank transfer" },
  { id: "other", label: "Other" },
];

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to record payments.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return fallback;
}

export function PaymentsTab({ workspaceId, userId, roles }: { workspaceId: string; userId: string | null; roles: AppRole[] }) {
  const canManage = canManageFinanceRecords(roles);
  const groupsQuery = useGroupsQuery(workspaceId);
  const groups = groupsQuery.data ?? [];
  const groupUsersQuery = useGroupUsersQuery(groups.map((g) => g.id));
  const groupUsers = (groupUsersQuery.data ?? []).filter((gu) => gu.status === "active");
  const clientsQuery = useClientsQuery(workspaceId);
  const clients = clientsQuery.data ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const groupUserIds = groupUsers.map((gu) => gu.id);
  const paymentsQuery = usePaymentsQuery(groupUserIds);
  const recordMutation = useRecordPaymentMutation(groupUserIds);
  const deleteMutation = useDeletePaymentMutation(groupUserIds);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PaymentEditorValues>({
    resolver: zodResolver(paymentEditorSchema),
    defaultValues: {
      group_user_id: "",
      amount: 0,
      payment_month: monthKey().slice(0, 7),
      payment_type: "full",
      payment_method: "cash",
      is_course_payment: false,
      notes: "",
    },
  });

  const memberOptions = groupUsers.map((gu) => {
    const client = gu.client_id ? clientById.get(gu.client_id) : undefined;
    const group = groupById.get(gu.group_id);
    return { id: gu.id, label: `${client?.full_name ?? "Unknown"} — ${group?.name ?? "Group"}` };
  });

  const onSubmit = handleSubmit(async (values) => {
    if (recordMutation.isPending) return;
    try {
      await recordMutation.mutateAsync({
        group_user_id: values.group_user_id,
        amount: values.amount,
        payment_month: `${values.payment_month}-01`,
        payment_type: values.payment_type,
        is_split_payment: values.payment_type === "split_first" || values.payment_type === "split_second",
        split_total_amount: null,
        notes: values.notes || null,
        recorded_by: userId,
        is_course_payment: values.is_course_payment,
        payment_method: values.payment_method,
      });
      reset({
        group_user_id: "",
        amount: 0,
        payment_month: monthKey().slice(0, 7),
        payment_type: "full",
        payment_method: "cash",
        is_course_payment: false,
        notes: "",
      });
    } catch {
      // surfaced below via mutation.error
    }
  });

  async function removePayment(id: string) {
    if (deleteMutation.isPending) return;
    if (!window.confirm("Delete this payment record? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // best-effort — mutation.error below covers the create-form path; deletion
      // failures here are rare (id ownership already scoped server-side).
    }
  }

  if (groupsQuery.isLoading || clientsQuery.isLoading) return <LoadingState label="Loading payments…" className="py-16" />;
  if (groupsQuery.isError) return <ErrorState error={groupsQuery.error} onRetry={() => groupsQuery.refetch()} className="py-16" />;
  if (clientsQuery.isError) return <ErrorState error={clientsQuery.error} onRetry={() => clientsQuery.refetch()} className="py-16" />;

  const payments = (paymentsQuery.data ?? []).slice().sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">Record and review tuition payments per enrolled member.</p>

      {canManage ? (
        <form onSubmit={onSubmit} className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
          <p className="mb-3 text-sm font-medium text-foreground">Record a payment</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Controller
              name="group_user_id"
              control={control}
              render={({ field, fieldState }) => (
                <div className="md:col-span-1">
                  <Label>Member</Label>
                  {memberOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/60">No active enrolled members yet.</p>
                  ) : (
                    <Select
                      aria-label="Member"
                      placeholder="Choose a member"
                      value={field.value}
                      onChange={(key) => typeof key === "string" && field.onChange(key)}
                      className="mt-1 w-full"
                      isInvalid={fieldState.invalid}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox items={memberOptions}>
                          {(opt) => (
                            <ListBox.Item id={opt.id} textValue={opt.label}>
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  <FieldError>{fieldState.error?.message}</FieldError>
                </div>
              )}
            />
            <Controller
              name="amount"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  value={field.value ? String(field.value) : ""}
                  onChange={(v) => field.onChange(v ? Number(v.replace(/\D/g, "")) : 0)}
                  onBlur={field.onBlur}
                  isInvalid={fieldState.invalid}
                >
                  <Label>Amount (UZS)</Label>
                  <Input inputMode="numeric" placeholder="500000" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="payment_month"
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} isInvalid={fieldState.invalid}>
                  <Label>Payment month</Label>
                  <Input type="month" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="payment_type"
              control={control}
              render={({ field }) => (
                <div>
                  <Label>Type</Label>
                  <Select
                    aria-label="Payment type"
                    value={field.value}
                    onChange={(key) => typeof key === "string" && field.onChange(key)}
                    className="mt-1 w-full"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={PAYMENT_TYPE_OPTIONS}>
                        {(opt) => (
                          <ListBox.Item id={opt.id} textValue={opt.label}>
                            {opt.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              )}
            />
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <div>
                  <Label>Method</Label>
                  <Select
                    aria-label="Payment method"
                    value={field.value}
                    onChange={(key) => typeof key === "string" && field.onChange(key)}
                    className="mt-1 w-full"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={PAYMENT_METHOD_OPTIONS}>
                        {(opt) => (
                          <ListBox.Item id={opt.id} textValue={opt.label}>
                            {opt.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              )}
            />
            <Controller
              name="is_course_payment"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4 rounded-md accent-primary"
                  />
                  One-time course payment
                </label>
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField {...field} className="md:col-span-3">
                  <Label>Notes</Label>
                  <Input placeholder="Optional" />
                </TextField>
              )}
            />
          </div>

          {recordMutation.error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errorMessage(recordMutation.error, "Couldn't record this payment.")}
            </p>
          ) : null}

          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" variant="primary" isDisabled={isSubmitting || recordMutation.isPending || memberOptions.length === 0}>
              {recordMutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </form>
      ) : null}

      {paymentsQuery.isLoading ? (
        <LoadingState label="Loading payment history…" className="py-10" />
      ) : paymentsQuery.isError ? (
        <ErrorState error={paymentsQuery.error} onRetry={() => paymentsQuery.refetch()} className="py-10" />
      ) : payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" description="Payments recorded above will show up here." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Member</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Amount</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Month</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Type</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Method</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Recorded</th>
                {canManage ? <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const gu = groupUsers.find((g) => g.id === payment.group_user_id);
                const client = gu?.client_id ? clientById.get(gu.client_id) : undefined;
                return (
                  <tr key={payment.id} className="border-b border-divider/60">
                    <td className="px-3 py-3 align-top text-sm text-foreground">{client?.full_name ?? "Unknown"}</td>
                    <td className="px-3 py-3 align-top text-sm text-foreground">{formatUZS(payment.amount)}</td>
                    <td className="px-3 py-3 align-top text-sm text-foreground">{payment.payment_month.slice(0, 7)}</td>
                    <td className="px-3 py-3 align-top text-sm text-foreground">{payment.payment_type}</td>
                    <td className="px-3 py-3 align-top text-sm text-foreground">{payment.payment_method}</td>
                    <td className="px-3 py-3 align-top text-sm text-foreground">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    {canManage ? (
                      <td className="px-3 py-3 align-top">
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={deleteMutation.isPending}
                          onPress={() => void removePayment(payment.id)}
                          aria-label="Delete payment"
                        >
                          <TrashBin className="size-3.5" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
