import { Chip } from "@heroui/react";
import type { MemberDisplayStatus } from "@/features/team/types";

const LABELS: Record<MemberDisplayStatus, string> = {
  active: "Active",
  invited: "Invited",
  deactivated: "Deactivated",
};

const COLORS: Record<MemberDisplayStatus, "success" | "warning" | "default"> = {
  active: "success",
  invited: "warning",
  deactivated: "default",
};

export function MemberStatusChip({ status }: { status: MemberDisplayStatus }) {
  return (
    <Chip size="sm" color={COLORS[status]} variant="soft">
      <Chip.Label>{LABELS[status]}</Chip.Label>
    </Chip>
  );
}
