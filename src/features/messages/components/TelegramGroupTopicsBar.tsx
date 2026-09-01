"use client";

import { useState } from "react";
import { Button, Dropdown, Input, Modal } from "@heroui/react";
import { EllipsisVertical, Lock, LockOpen, Pencil, Plus, TrashBin } from "@gravity-ui/icons";

import type { TelegramForumTopic } from "@/features/messages/types";
import { useTelegramGroupTopicMutations } from "@/features/messages/hooks/useTelegramGroupTopics";

export interface TelegramGroupTopicsBarProps {
  chatId: string;
  topics: TelegramForumTopic[];
  selectedTopicId: number | null;
  onSelect: (topic: TelegramForumTopic) => void;
  onTopicCreated?: (topic: TelegramForumTopic) => void;
  onTopicDeleted?: (topicId: number) => void;
  disabled?: boolean;
}

/** Forum topic tabs + create/rename/close/delete (TDLib linked supergroups). */
export function TelegramGroupTopicsBar({
  chatId,
  topics,
  selectedTopicId,
  onSelect,
  onTopicCreated,
  onTopicDeleted,
  disabled,
}: TelegramGroupTopicsBarProps) {
  const mutations = useTelegramGroupTopicMutations(chatId);
  const busy =
    disabled ||
    mutations.create.isPending ||
    mutations.rename.isPending ||
    mutations.setClosed.isPending ||
    mutations.remove.isPending;

  const [showCreate, setShowCreate] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TelegramForumTopic | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreate() {
    const name = newTopicName.trim();
    if (!name || mutations.create.isPending) return;
    setCreateError(null);
    try {
      const created = await mutations.create.mutateAsync(name);
      const topic: TelegramForumTopic = {
        forum_topic_id: created.forum_topic_id,
        name: created.name,
        is_general: false,
        is_closed: false,
        is_pinned: false,
        unread_count: 0,
      };
      setNewTopicName("");
      setShowCreate(false);
      onTopicCreated?.(topic);
      onSelect(topic);
    } catch {
      setCreateError("Couldn't create topic.");
    }
  }

  async function handleRename(topicId: number) {
    const name = renameValue.trim();
    if (!name || mutations.rename.isPending) return;
    setRenameError(null);
    try {
      await mutations.rename.mutateAsync({ topicId, name });
      setRenamingId(null);
    } catch {
      setRenameError("Couldn't rename topic.");
    }
  }

  async function handleToggleClosed(topic: TelegramForumTopic) {
    setActionError(null);
    try {
      await mutations.setClosed.mutateAsync({ topicId: topic.forum_topic_id, isClosed: !topic.is_closed });
    } catch {
      setActionError("Couldn't update topic.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || mutations.remove.isPending) return;
    setActionError(null);
    try {
      await mutations.remove.mutateAsync(deleteTarget.forum_topic_id);
      onTopicDeleted?.(deleteTarget.forum_topic_id);
      setDeleteTarget(null);
    } catch {
      setActionError("Couldn't delete topic.");
    }
  }

  if (!topics.length && !showCreate) {
    return (
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
        <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => setShowCreate(true)}>
          <Plus className="size-3.5" aria-hidden="true" />
          New topic
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-thin">
          {topics.map((topic) => {
            const active = selectedTopicId === topic.forum_topic_id;
            const isRenaming = renamingId === topic.forum_topic_id;

            if (isRenaming) {
              return (
                <div key={topic.forum_topic_id} className="flex shrink-0 items-center gap-1">
                  <Input
                    aria-label="Rename topic"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(topic.forum_topic_id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-8 w-36 min-h-8"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    isDisabled={busy || !renameValue.trim()}
                    onPress={() => void handleRename(topic.forum_topic_id)}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onPress={() => setRenamingId(null)}>
                    Cancel
                  </Button>
                </div>
              );
            }

            return (
              <div key={topic.forum_topic_id} className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(topic)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    active
                      ? "bg-[#26A5E4]/15 text-[#1b7fb0]"
                      : "bg-black/[0.04] text-foreground/70 hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
                  }`}
                >
                  <span className="max-w-[140px] truncate">{topic.name || "Topic"}</span>
                  {topic.is_closed ? <span className="text-[10px] uppercase text-foreground/40">closed</span> : null}
                  {(topic.unread_count ?? 0) > 0 ? (
                    <span className="rounded-full bg-[#26A5E4] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {topic.unread_count}
                    </span>
                  ) : null}
                </button>
                {!topic.is_general ? (
                  <Dropdown>
                    <Dropdown.Trigger
                      aria-label={`Topic actions: ${topic.name}`}
                      className="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-black/[0.06] hover:text-foreground disabled:opacity-50 dark:hover:bg-white/[0.08]"
                      isDisabled={busy}
                    >
                      <EllipsisVertical className="size-3.5" />
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement="bottom end">
                      <Dropdown.Menu aria-label="Topic actions">
                        <Dropdown.Item
                          id="rename"
                          onAction={() => {
                            setRenameError(null);
                            setRenameValue(topic.name);
                            setRenamingId(topic.forum_topic_id);
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Rename
                        </Dropdown.Item>
                        <Dropdown.Item id="close" onAction={() => void handleToggleClosed(topic)}>
                          {topic.is_closed ? (
                            <LockOpen className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Lock className="size-3.5" aria-hidden="true" />
                          )}
                          {topic.is_closed ? "Reopen topic" : "Close topic"}
                        </Dropdown.Item>
                        <Dropdown.Item
                          id="delete"
                          variant="danger"
                          onAction={() => setDeleteTarget(topic)}
                        >
                          <TrashBin className="size-3.5" aria-hidden="true" />
                          Delete topic
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                ) : null}
              </div>
            );
          })}

          {!showCreate ? (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              isDisabled={busy}
              onPress={() => {
                setCreateError(null);
                setShowCreate(true);
              }}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New topic
            </Button>
          ) : null}
        </div>

        {showCreate ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.04] px-3 py-2 dark:border-white/[0.06]">
            <Input
              aria-label="New topic name"
              placeholder="Topic name"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
                if (e.key === "Escape") {
                  setShowCreate(false);
                  setNewTopicName("");
                }
              }}
              className="h-8 min-h-8 flex-1"
              autoFocus
            />
            <Button size="sm" isDisabled={busy || !newTopicName.trim()} onPress={() => void handleCreate()}>
              {mutations.create.isPending ? "Creating…" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                setShowCreate(false);
                setNewTopicName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : null}

        {createError || renameError || actionError ? (
          <p className="px-3 pb-2 text-xs text-danger">{createError ?? renameError ?? actionError}</p>
        ) : null}
      </div>

      <Modal isOpen={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Delete topic?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span> and all messages in
                  it? This cannot be undone.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" isDisabled={mutations.remove.isPending} onPress={() => void confirmDelete()}>
                  {mutations.remove.isPending ? "Deleting…" : "Delete"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
