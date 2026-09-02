export type InboxFilter = "all" | "unread" | "mine" | "unassigned";

export function resolveChatAssigneeDisplay(args: {
  assignedTo?: string | null;
  currentUserId?: string | null;
  labelByUserId?: Record<string, string | undefined>;
}): { assignee: string; unassigned: boolean } {
  const { assignedTo, currentUserId, labelByUserId } = args;
  if (!assignedTo) return { assignee: "Unassigned", unassigned: true };
  if (assignedTo === currentUserId) return { assignee: "Assigned to you", unassigned: false };
  const label = labelByUserId?.[assignedTo]?.trim();
  return { assignee: label ? `Assigned to ${label}` : "Assigned", unassigned: false };
}

export function resolveAssignedToParam(
  filter: InboxFilter,
  operatorFilterId: string | null,
  currentUserId?: string | null,
): string | undefined {
  if (operatorFilterId) return operatorFilterId;
  if (filter === "mine") return currentUserId ?? undefined;
  if (filter === "unassigned") return "none";
  return undefined;
}
