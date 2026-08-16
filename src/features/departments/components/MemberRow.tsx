"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useRemoveDepartmentMemberMutation,
  useUpdateDepartmentMemberMutation,
} from "@/features/departments/hooks/useDepartments";
import { isValidTelegramChatId, type DepartmentMember, type DepartmentNotifyMode } from "@/features/departments/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    return error.message;
  }
  return "Couldn't save that change.";
}

/**
 * One escalation contact — own local state so editing one person never
 * touches another. Blur-to-save (not a form submit) matches the old
 * frontend's `MemberRow.tsx` exactly.
 */
export function MemberRow({
  departmentId,
  member,
  notifyMode,
}: {
  departmentId: string;
  member: DepartmentMember;
  notifyMode: DepartmentNotifyMode;
}) {
  const updateMember = useUpdateDepartmentMemberMutation();
  const removeMember = useRemoveDepartmentMemberMutation();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(member.contact_full_name ?? "");
  const [username, setUsername] = useState(member.telegram_username ?? "");
  const [chatId, setChatId] = useState(member.telegram_chat_id ?? "");

  async function saveIfChanged(patch: Record<string, string>, revert: () => void) {
    setError(null);
    try {
      await updateMember.mutateAsync({ departmentId, memberId: member.id, patch });
    } catch (err) {
      setError(errorMessage(err));
      revert();
    }
  }

  async function remove() {
    if (removeMember.isPending) return; // guard double-submit
    setError(null);
    try {
      await removeMember.mutateAsync({ departmentId, memberId: member.id });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <TextField
          value={fullName}
          onChange={setFullName}
          onBlur={() => {
            const trimmed = fullName.trim();
            if (trimmed === (member.contact_full_name ?? "")) return;
            void saveIfChanged({ contact_full_name: trimmed }, () => setFullName(member.contact_full_name ?? ""));
          }}
        >
          <Label>Full name</Label>
          <Input placeholder="e.g. Aziz Karimov" />
        </TextField>

        <TextField
          value={username}
          onChange={setUsername}
          onBlur={() => {
            const trimmed = username.trim();
            if (trimmed === (member.telegram_username ?? "")) return;
            void saveIfChanged({ telegram_username: trimmed }, () => setUsername(member.telegram_username ?? ""));
          }}
        >
          <Label>Telegram username (optional)</Label>
          <Input placeholder="@username" />
        </TextField>

        {notifyMode === "dm" ? (
          <TextField
            value={chatId}
            onChange={setChatId}
            onBlur={() => {
              const trimmed = chatId.trim();
              if (trimmed === (member.telegram_chat_id ?? "")) return;
              if (!isValidTelegramChatId(trimmed)) {
                setError("Telegram chat ID must be numeric.");
                setChatId(member.telegram_chat_id ?? "");
                return;
              }
              void saveIfChanged({ telegram_chat_id: trimmed }, () => setChatId(member.telegram_chat_id ?? ""));
            }}
          >
            <Label>Telegram chat ID</Label>
            <Input placeholder="123456789" inputMode="numeric" />
          </TextField>
        ) : (
          <div />
        )}

        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Remove member"
          onPress={remove}
          isDisabled={removeMember.isPending}
        >
          <TrashBin className="size-3.5" />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
