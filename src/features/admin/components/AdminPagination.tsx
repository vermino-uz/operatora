"use client";

import { Button } from "@heroui/react";

export function AdminPagination({
  page,
  total,
  perPage,
  onPageChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;
  return (
    <div className="flex items-center justify-between text-sm text-foreground/60">
      <span>
        Page {page} / {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => onPageChange(page - 1)}>
          Prev
        </Button>
        <Button size="sm" variant="secondary" isDisabled={page >= totalPages} onPress={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
