"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { FieldError } from "@/features/finance/components/RhfFieldError";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { expenseCategoryEditorSchema, expenseEditorSchema, type ExpenseCategoryEditorValues, type ExpenseEditorValues } from "@/features/finance/schema";
import { formatUZS } from "@/features/finance/utils";
import { canManageFinanceRecords } from "@/features/finance/permissions";
import {
  useCreateExpenseCategoryMutation,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useExpenseCategoriesQuery,
  useExpensesQuery,
  useSetExpenseCategoryActiveMutation,
} from "@/features/finance/hooks/useFinance";
import type { AppRole } from "@/types/entities";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage expenses.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return fallback;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesTab({ workspaceId, userId, roles }: { workspaceId: string; userId: string | null; roles: AppRole[] }) {
  const canManage = canManageFinanceRecords(roles);
  const categoriesQuery = useExpenseCategoriesQuery(workspaceId);
  const expensesQuery = useExpensesQuery(workspaceId);
  const createExpense = useCreateExpenseMutation(workspaceId);
  const deleteExpense = useDeleteExpenseMutation(workspaceId);
  const createCategory = useCreateExpenseCategoryMutation(workspaceId);
  const setCategoryActive = useSetExpenseCategoryActiveMutation(workspaceId);

  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const categories = categoriesQuery.data ?? [];
  const activeCategories = categories.filter((c) => c.is_active);
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ExpenseEditorValues>({
    resolver: zodResolver(expenseEditorSchema),
    defaultValues: { amount: 0, description: "", category: "", expense_date: todayIso(), notes: "" },
  });

  const {
    control: categoryControl,
    handleSubmit: handleCategorySubmit,
    reset: resetCategoryForm,
    formState: { isSubmitting: isCreatingCategory },
  } = useForm<ExpenseCategoryEditorValues>({
    resolver: zodResolver(expenseCategoryEditorSchema),
    defaultValues: { name: "", label: "", color: "#6366f1" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (createExpense.isPending) return;
    try {
      await createExpense.mutateAsync({
        amount: values.amount,
        description: values.description,
        category: values.category,
        expense_date: values.expense_date,
        notes: values.notes || null,
        recorded_by: userId,
      });
      reset({ amount: 0, description: "", category: values.category, expense_date: todayIso(), notes: "" });
    } catch {
      // surfaced below via mutation.error
    }
  });

  async function onCreateCategory(values: ExpenseCategoryEditorValues) {
    if (createCategory.isPending) return;
    try {
      await createCategory.mutateAsync({ name: values.name, label: values.label, color: values.color || null, created_by: userId });
      resetCategoryForm({ name: "", label: "", color: "#6366f1" });
      setShowCategoryForm(false);
    } catch {
      // surfaced below via mutation.error
    }
  }

  async function removeExpense(id: string) {
    if (deleteExpense.isPending) return;
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteExpense.mutateAsync(id);
    } catch {
      // best-effort; scoping already prevents cross-tenant deletes server-side.
    }
  }

  if (categoriesQuery.isLoading || expensesQuery.isLoading) return <LoadingState label="Loading expenses…" className="py-16" />;
  if (categoriesQuery.isError) return <ErrorState error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} className="py-16" />;
  if (expensesQuery.isError) return <ErrorState error={expensesQuery.error} onRetry={() => expensesQuery.refetch()} className="py-16" />;

  const expenses = expensesQuery.data ?? [];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryOptions = activeCategories.map((c) => ({ id: c.name, label: c.label }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">
        {formatUZS(totalExpenses)} total across {expenses.length} expense{expenses.length === 1 ? "" : "s"}.
      </p>

      {canManage ? (
        <form onSubmit={onSubmit} className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Record an expense</p>
            <Button type="button" size="sm" variant="ghost" onPress={() => setShowCategoryForm((v) => !v)}>
              <Plus className="size-3.5" />
              Manage categories
            </Button>
          </div>

          {showCategoryForm ? (
            <form
              onSubmit={handleCategorySubmit(onCreateCategory)}
              className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-foreground/5 p-2"
            >
              <Controller
                name="name"
                control={categoryControl}
                render={({ field, fieldState }) => (
                  <TextField {...field} isInvalid={fieldState.invalid} className="min-w-[140px]">
                    <Label>Key</Label>
                    <Input placeholder="rent" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                name="label"
                control={categoryControl}
                render={({ field, fieldState }) => (
                  <TextField {...field} isInvalid={fieldState.invalid} className="min-w-[140px]">
                    <Label>Label</Label>
                    <Input placeholder="Rent" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <Controller
                name="color"
                control={categoryControl}
                render={({ field }) => (
                  <TextField {...field} className="w-28">
                    <Label>Color</Label>
                    <Input type="color" />
                  </TextField>
                )}
              />
              <Button type="submit" size="sm" variant="secondary" isDisabled={isCreatingCategory || createCategory.isPending}>
                Add category
              </Button>
              {createCategory.error ? (
                <p role="alert" className="w-full text-sm text-danger">
                  {errorMessage(createCategory.error, "Couldn't create this category.")}
                </p>
              ) : null}

              {categories.length > 0 ? (
                <div className="flex w-full flex-wrap gap-2 pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => void setCategoryActive.mutate({ id: cat.id, isActive: !cat.is_active })}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        cat.is_active ? "bg-primary/15 text-primary" : "bg-foreground/10 text-foreground/50 line-through"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </form>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                  <Input inputMode="numeric" placeholder="150000" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} isInvalid={fieldState.invalid} className="md:col-span-2">
                  <Label>Description</Label>
                  <Input placeholder="Office rent — September" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <Label>Category</Label>
                  {categoryOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-foreground/60">Add a category above first.</p>
                  ) : (
                    <Select
                      aria-label="Category"
                      placeholder="Choose"
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
                        <ListBox items={categoryOptions}>
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
              name="expense_date"
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} isInvalid={fieldState.invalid}>
                  <Label>Date</Label>
                  <Input type="date" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField {...field} className="md:col-span-2">
                  <Label>Notes</Label>
                  <Input placeholder="Optional" />
                </TextField>
              )}
            />
          </div>

          {createExpense.error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errorMessage(createExpense.error, "Couldn't record this expense.")}
            </p>
          ) : null}

          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" variant="primary" isDisabled={isSubmitting || createExpense.isPending || categoryOptions.length === 0}>
              {createExpense.isPending ? "Saving…" : "Record expense"}
            </Button>
          </div>
        </form>
      ) : null}

      {expenses.length === 0 ? (
        <EmptyState title="No expenses recorded yet" description="Expenses recorded above will show up here." />
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Date</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Description</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Category</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Amount</th>
                {canManage ? <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-divider/60">
                  <td className="px-3 py-3 align-top text-sm text-foreground">{new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">
                    {expense.description}
                    {expense.notes ? <p className="text-xs text-foreground/60">{expense.notes}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{categoryByName.get(expense.category)?.label ?? expense.category}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{formatUZS(expense.amount)}</td>
                  {canManage ? (
                    <td className="px-3 py-3 align-top">
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={deleteExpense.isPending}
                        onPress={() => void removeExpense(expense.id)}
                        aria-label="Delete expense"
                      >
                        <TrashBin className="size-3.5" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
