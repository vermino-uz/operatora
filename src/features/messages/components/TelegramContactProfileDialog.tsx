"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Input, Modal, Spinner } from "@heroui/react";
import {
  ArrowLeft,
  ArrowUpRightFromSquare,
  Check,
  Copy,
  FileText,
  Headphones,
  Link as LinkIcon,
  Lock,
  LockOpen,
  Microphone as Mic,
  Pencil,
  Persons,
  Picture,
  Plus,
  TrashBin,
  Video,
  Xmark,
} from "@gravity-ui/icons";

import { PhotoLightbox, type PhotoLightboxItem } from "@/features/messages/components/PhotoLightbox";
import { VoiceMessagePlayer } from "@/features/messages/components/VoiceMessagePlayer";
import { useTelegramGroupTopicMutations } from "@/features/messages/hooks/useTelegramGroupTopics";
import {
  PROFILE_MEDIA_LABELS,
  computeProfileMediaStats,
  formatProfileLastActive,
  groupProfileMediaByKind,
  profileMessageMediaUrl,
  type ProfileMediaCategory,
} from "@/features/messages/lib/telegramContactProfile";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import {
  initialsFor,
  isTelegramGroupChat,
  telegramChatAvatarUrl,
  telegramChatName,
  type TelegramChat,
  type TelegramForumTopic,
  type TelegramMessage,
} from "@/features/messages/types";
import { telegramAccountApi, type TelegramGroupMember } from "@/services/api/telegramAccount";

export interface TelegramContactProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chat: TelegramChat | null;
  messages: TelegramMessage[];
  /** Linked-account mode — open a DM with a group member. */
  onOpenDm?: (userId: number) => void;
}

function memberName(m: TelegramGroupMember): string {
  const full = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return full || (m.username ? `@${m.username}` : `User ${m.id}`);
}

export function TelegramContactProfileDialog({
  isOpen,
  onClose,
  chat,
  messages,
  onOpenDm,
}: TelegramContactProfileDialogProps) {
  const [mediaView, setMediaView] = useState<ProfileMediaCategory | null>(null);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState<string | null>(null);

  const [members, setMembers] = useState<TelegramGroupMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [topics, setTopics] = useState<TelegramForumTopic[] | null>(null);

  const [adminBusy, setAdminBusy] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberValue, setAddMemberValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [renamingTopicId, setRenamingTopicId] = useState<number | null>(null);
  const [renameTopicValue, setRenameTopicValue] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const isGroupChat = Boolean(chat && isTelegramGroupChat(chat));
  const topicMutations = useTelegramGroupTopicMutations(chat?.id ?? "");

  const stats = useMemo(() => computeProfileMediaStats(messages), [messages]);
  const mediaByKind = useMemo(() => groupProfileMediaByKind(messages), [messages]);

  const photoLightboxItems: PhotoLightboxItem[] = useMemo(() => {
    return mediaByKind.photo
      .map((m) => {
        if (!chat) return null;
        const url = profileMessageMediaUrl(m, chat);
        if (!url) return null;
        const caption = (m.text_content || "").trim();
        return { id: m.id, url, ...(caption ? { caption } : {}) };
      })
      .filter((x): x is PhotoLightboxItem => x !== null);
  }, [chat, mediaByKind.photo]);

  useEffect(() => {
    if (!isOpen) {
      setMediaView(null);
      setPhotoLightboxIndex(null);
      setLocalTitle(null);
      setAdminError(null);
      setInviteLink(null);
      setInviteCopied(false);
      setShowAddMember(false);
      setAddMemberValue("");
      setRenaming(false);
      setShowAddTopic(false);
      setNewTopicName("");
      setRenamingTopicId(null);
      setMembers(null);
      setTopics(null);
      setAvatarFailed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !chat?.id || !isGroupChat) {
      setMembers(null);
      setTopics(null);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    void (async () => {
      try {
        const [membersRes, topicsRes] = await Promise.allSettled([
          telegramAccountApi.listGroupMembers(chat.id),
          telegramAccountApi.listGroupTopics(chat.id),
        ]);
        if (cancelled) return;
        if (membersRes.status === "fulfilled") {
          setMembers(Array.isArray(membersRes.value.members) ? membersRes.value.members : []);
        } else {
          setMembers([]);
        }
        if (topicsRes.status === "fulfilled") {
          setTopics(Array.isArray(topicsRes.value.topics) ? topicsRes.value.topics : []);
        } else {
          setTopics(null);
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, chat?.id, isGroupChat]);

  const refreshMembers = useCallback(async () => {
    if (!chat?.id) return;
    try {
      const data = await telegramAccountApi.listGroupMembers(chat.id);
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch {
      /* ignore */
    }
  }, [chat?.id]);

  async function runAdmin(action: string, fn: () => Promise<unknown>) {
    setAdminBusy(action);
    setAdminError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Action failed.");
      return false;
    } finally {
      setAdminBusy(null);
    }
  }

  if (!chat) return null;

  const displayName = localTitle || telegramChatName(chat);
  const avatarColor = pickAvatarColor(chat.id);
  const initials = initialsFor(displayName);
  const avatarUrl = telegramChatAvatarUrl(chat);
  const userIdLabel = chat.telegram_user_id
    ? String(chat.telegram_user_id)
    : chat.telegram_chat_id
      ? String(chat.telegram_chat_id)
      : null;

  function handleClose() {
    setMediaView(null);
    onClose();
  }

  function renderMediaBody() {
    if (!chat || !mediaView) return null;

    if (mediaView === "photo") {
      if (!mediaByKind.photo.length) {
        return <p className="py-10 text-center text-sm text-foreground/45">No photos shared yet.</p>;
      }
      return (
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {mediaByKind.photo.map((m) => {
            const url = profileMessageMediaUrl(m, chat);
            if (!url) return null;
            const idx = photoLightboxItems.findIndex((p) => p.id === m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPhotoLightboxIndex(idx >= 0 ? idx : 0)}
                className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-[var(--default)] dark:border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied Telegram photo */}
                <img src={url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
      );
    }

    if (mediaView === "video") {
      if (!mediaByKind.video.length) {
        return <p className="py-10 text-center text-sm text-foreground/45">No videos shared yet.</p>;
      }
      return (
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {mediaByKind.video.map((m) => {
            const url = profileMessageMediaUrl(m, chat);
            if (!url) return null;
            return (
              <a
                key={m.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-black dark:border-white/10"
              >
                <video src={url} preload="metadata" muted playsInline className="size-full object-cover" />
              </a>
            );
          })}
        </div>
      );
    }

    if (mediaView === "audio" || mediaView === "voice") {
      const items = mediaView === "voice" ? mediaByKind.voice : mediaByKind.audio;
      if (!items.length) {
        return <p className="py-10 text-center text-sm text-foreground/45">No audio shared yet.</p>;
      }
      return (
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {items.map((m) => {
            const url = profileMessageMediaUrl(m, chat);
            if (!url) return null;
            return (
              <div key={m.id} className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  {mediaView === "voice" ? (
                    <Mic className="size-4 text-[#26A5E4]" aria-hidden="true" />
                  ) : (
                    <Headphones className="size-4 text-[#26A5E4]" aria-hidden="true" />
                  )}
                  <span className="truncate text-sm text-foreground/70">
                    {(m.text_content || "").trim() || (mediaView === "voice" ? "Voice message" : "Audio file")}
                  </span>
                </div>
                <VoiceMessagePlayer src={url} direction="inbound" />
              </div>
            );
          })}
        </div>
      );
    }

    if (mediaView === "document") {
      if (!mediaByKind.document.length) {
        return <p className="py-10 text-center text-sm text-foreground/45">No files shared yet.</p>;
      }
      return (
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {mediaByKind.document.map((m) => {
            const url = profileMessageMediaUrl(m, chat);
            const name = (m.text_content || "").trim() || "Document";
            return (
              <a
                key={m.id}
                href={url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--default)] ${url ? "" : "pointer-events-none opacity-50"}`}
              >
                <FileText className="size-4 shrink-0 text-foreground/45" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                {url ? <ArrowUpRightFromSquare className="size-3.5 shrink-0 text-foreground/40" /> : null}
              </a>
            );
          })}
        </div>
      );
    }

    if (mediaView === "links") {
      if (!mediaByKind.links.length) {
        return <p className="py-10 text-center text-sm text-foreground/45">No links shared yet.</p>;
      }
      return (
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {mediaByKind.links.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 hover:bg-[var(--default)]"
            >
              <p className="line-clamp-2 break-all text-sm text-[#26A5E4]">{item.url}</p>
            </a>
          ))}
        </div>
      );
    }

    return null;
  }

  return (
    <>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Modal.Container size="md">
          <Modal.Dialog className="max-w-[420px] overflow-hidden p-0">
            {mediaView ? (
              <>
                <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2.5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setMediaView(null)}
                    aria-label="Back"
                    className="flex size-8 items-center justify-center rounded-full hover:bg-[var(--default)]"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                  <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{PROFILE_MEDIA_LABELS[mediaView]}</h2>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="flex size-8 items-center justify-center rounded-full hover:bg-[var(--default)]"
                  >
                    <Xmark className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="max-h-[min(420px,60vh)] overflow-y-auto">{renderMediaBody()}</div>
              </>
            ) : (
              <>
                <div className="relative border-b border-black/10 px-5 pb-4 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full hover:bg-[var(--default)]"
                  >
                    <Xmark className="size-4" aria-hidden="true" />
                  </button>
                  <div className="flex flex-col items-center pt-2 text-center">
                    <div
                      className="relative mb-3 flex size-24 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold text-white shadow-sm"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {!avatarFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element -- proxied chat avatar
                        <img
                          src={avatarUrl}
                          alt=""
                          className="size-full object-cover"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                    <p className="mt-1 text-xs text-foreground/45">{formatProfileLastActive(chat.last_message_at)}</p>
                    {chat.business_connection_id ? (
                      <span className="mt-2 rounded bg-[#26A5E4] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Business
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="max-h-[min(480px,65vh)] overflow-y-auto">
                  <div className="space-y-3 border-b border-black/10 px-5 py-3 dark:border-white/10">
                    {chat.username ? (
                      <div>
                        <p className="text-sm font-medium text-[#26A5E4]">@{chat.username}</p>
                        <p className="text-[11px] text-foreground/45">Username</p>
                      </div>
                    ) : null}
                    {userIdLabel ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{userIdLabel}</p>
                        <p className="text-[11px] text-foreground/45">Telegram ID</p>
                      </div>
                    ) : null}
                    {chat.phone ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{chat.phone}</p>
                        <p className="text-[11px] text-foreground/45">Phone</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-b border-black/10 py-1 dark:border-white/10">
                    <ProfileStatRow
                      icon={<Picture className="size-4" aria-hidden="true" />}
                      count={stats.photos}
                      label="photos"
                      emptyLabel="No photos"
                      onClick={() => setMediaView("photo")}
                    />
                    <ProfileStatRow
                      icon={<Video className="size-4" aria-hidden="true" />}
                      count={stats.videos}
                      label="videos"
                      emptyLabel="No videos"
                      onClick={() => setMediaView("video")}
                    />
                    <ProfileStatRow
                      icon={<Headphones className="size-4" aria-hidden="true" />}
                      count={stats.audio}
                      label="audio files"
                      emptyLabel="No audio"
                      onClick={() => setMediaView("audio")}
                    />
                    <ProfileStatRow
                      icon={<Mic className="size-4" aria-hidden="true" />}
                      count={stats.voice}
                      label="voice messages"
                      emptyLabel="No voice messages"
                      onClick={() => setMediaView("voice")}
                    />
                    <ProfileStatRow
                      icon={<FileText className="size-4" aria-hidden="true" />}
                      count={stats.files}
                      label="files"
                      emptyLabel="No files"
                      onClick={() => setMediaView("document")}
                    />
                    <ProfileStatRow
                      icon={<LinkIcon className="size-4" aria-hidden="true" />}
                      count={stats.links}
                      label="links"
                      emptyLabel="No links"
                      onClick={() => setMediaView("links")}
                    />
                  </div>

                  {isGroupChat ? (
                    <div className="border-b border-black/10 px-5 py-3 dark:border-white/10">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                        {membersLoading ? "Loading members…" : `${members?.length ?? 0} members`}
                      </p>
                      {adminError ? <p className="mb-2 text-xs text-danger">{adminError}</p> : null}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={adminBusy === "invite"}
                          onPress={() =>
                            void runAdmin("invite", async () => {
                              const data = await telegramAccountApi.getGroupInviteLink(chat.id);
                              setInviteLink(data.invite_link);
                              setInviteCopied(false);
                            })
                          }
                        >
                          <LinkIcon className="size-3.5" aria-hidden="true" />
                          Invite link
                        </Button>
                        <Button size="sm" variant="secondary" onPress={() => setShowAddMember((v) => !v)}>
                          <Plus className="size-3.5" aria-hidden="true" />
                          Add member
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
                            setRenaming((v) => !v);
                            setRenameValue(displayName);
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Rename
                        </Button>
                      </div>
                      {inviteLink ? (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-black/10 bg-[var(--default)] px-2 py-1.5 dark:border-white/10">
                          <span className="min-w-0 flex-1 truncate text-xs text-foreground/60">{inviteLink}</span>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(inviteLink).then(() => setInviteCopied(true))}
                            className="flex size-7 items-center justify-center rounded-md hover:bg-background"
                            aria-label="Copy invite link"
                          >
                            {inviteCopied ? (
                              <Check className="size-3.5 text-success" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      ) : null}
                      {showAddMember ? (
                        <div className="mb-3 flex gap-2">
                          <Input
                            placeholder="@username"
                            value={addMemberValue}
                            onChange={(e) => setAddMemberValue(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            isDisabled={!addMemberValue.trim() || adminBusy === "add"}
                            onPress={() =>
                              void runAdmin("add", async () => {
                                await telegramAccountApi.addGroupMember(chat.id, {
                                  username: addMemberValue.trim().replace(/^@/, ""),
                                });
                                setAddMemberValue("");
                                setShowAddMember(false);
                                await refreshMembers();
                              })
                            }
                          >
                            Add
                          </Button>
                        </div>
                      ) : null}
                      {renaming ? (
                        <div className="mb-3 flex gap-2">
                          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1" />
                          <Button
                            size="sm"
                            isDisabled={!renameValue.trim() || adminBusy === "rename"}
                            onPress={() =>
                              void runAdmin("rename", async () => {
                                await telegramAccountApi.renameGroup(chat.id, renameValue.trim());
                                setLocalTitle(renameValue.trim());
                                setRenaming(false);
                              })
                            }
                          >
                            Save
                          </Button>
                        </div>
                      ) : null}
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {membersLoading ? (
                          <div className="flex justify-center py-4">
                            <Spinner size="sm" />
                          </div>
                        ) : (
                          (members ?? []).map((m) => (
                            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--default)]">
                              <div
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                                style={{ backgroundColor: pickAvatarColor(String(m.id)) }}
                              >
                                {initialsFor(memberName(m)).slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{memberName(m)}</p>
                                {m.status === "administrator" ? (
                                  <p className="text-[10px] text-foreground/45">Admin</p>
                                ) : null}
                              </div>
                              <Dropdown>
                                <Dropdown.Trigger
                                  aria-label="Member actions"
                                  className="flex size-7 items-center justify-center rounded-md text-foreground/45 hover:bg-background"
                                >
                                  ···
                                </Dropdown.Trigger>
                                <Dropdown.Popover placement="bottom end">
                                  <Dropdown.Menu aria-label="Member actions">
                                    {onOpenDm ? (
                                      <Dropdown.Item id="dm" onAction={() => onOpenDm(m.id)}>
                                        Message
                                      </Dropdown.Item>
                                    ) : null}
                                    <Dropdown.Item
                                      id="promote"
                                      onAction={() =>
                                        void runAdmin(`promote:${m.id}`, async () => {
                                          const makeAdmin = m.status !== "administrator";
                                          await telegramAccountApi.promoteGroupMember(chat.id, m.id, makeAdmin);
                                          setMembers((prev) =>
                                            (prev ?? []).map((row) =>
                                              row.id === m.id
                                                ? { ...row, status: makeAdmin ? "administrator" : "member" }
                                                : row,
                                            ),
                                          );
                                        })
                                      }
                                    >
                                      {m.status === "administrator" ? "Remove admin" : "Make admin"}
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      id="ban"
                                      className="text-danger"
                                      onAction={() =>
                                        void runAdmin(`ban:${m.id}`, async () => {
                                          await telegramAccountApi.banGroupMember(chat.id, m.id);
                                          setMembers((prev) => (prev ?? []).filter((row) => row.id !== m.id));
                                        })
                                      }
                                    >
                                      Remove from group
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown.Popover>
                              </Dropdown>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}

                  {isGroupChat && topics && topics.length > 0 ? (
                    <div className="px-5 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/45">Topics</p>
                        <Button size="sm" variant="secondary" onPress={() => setShowAddTopic((v) => !v)}>
                          <Plus className="size-3.5" aria-hidden="true" />
                          New topic
                        </Button>
                      </div>
                      {showAddTopic ? (
                        <div className="mb-3 flex gap-2">
                          <Input
                            placeholder="Topic name"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            isDisabled={!newTopicName.trim() || topicMutations.create.isPending}
                            onPress={() =>
                              void (async () => {
                                try {
                                  const created = await topicMutations.create.mutateAsync(newTopicName.trim());
                                  setTopics((prev) => [
                                    ...(prev ?? []),
                                    {
                                      forum_topic_id: created.forum_topic_id,
                                      name: created.name,
                                      is_general: false,
                                      is_closed: false,
                                      is_pinned: false,
                                      unread_count: 0,
                                    },
                                  ]);
                                  setNewTopicName("");
                                  setShowAddTopic(false);
                                } catch {
                                  setAdminError("Couldn't create topic.");
                                }
                              })()
                            }
                          >
                            Create
                          </Button>
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        {topics.map((tp) => (
                          <div key={tp.forum_topic_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--default)]">
                            {renamingTopicId === tp.forum_topic_id ? (
                              <>
                                <Input
                                  value={renameTopicValue}
                                  onChange={(e) => setRenameTopicValue(e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onPress={() =>
                                    void (async () => {
                                      try {
                                        await topicMutations.rename.mutateAsync({
                                          topicId: tp.forum_topic_id,
                                          name: renameTopicValue.trim(),
                                        });
                                        setTopics((prev) =>
                                          (prev ?? []).map((row) =>
                                            row.forum_topic_id === tp.forum_topic_id
                                              ? { ...row, name: renameTopicValue.trim() }
                                              : row,
                                          ),
                                        );
                                        setRenamingTopicId(null);
                                      } catch {
                                        setAdminError("Couldn't rename topic.");
                                      }
                                    })()
                                  }
                                >
                                  Save
                                </Button>
                              </>
                            ) : (
                              <>
                                <Persons className="size-3.5 shrink-0 text-foreground/40" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-sm">
                                  {tp.name}
                                  {tp.is_closed ? " (closed)" : ""}
                                </span>
                                <Dropdown>
                                  <Dropdown.Trigger
                                    aria-label="Topic actions"
                                    className="flex size-7 items-center justify-center rounded-md text-foreground/45 hover:bg-background"
                                  >
                                    ···
                                  </Dropdown.Trigger>
                                  <Dropdown.Popover placement="bottom end">
                                    <Dropdown.Menu aria-label="Topic actions">
                                      {!tp.is_general ? (
                                        <Dropdown.Item
                                          id="rename"
                                          onAction={() => {
                                            setRenamingTopicId(tp.forum_topic_id);
                                            setRenameTopicValue(tp.name);
                                          }}
                                        >
                                          <Pencil className="size-3.5" aria-hidden="true" />
                                          Rename
                                        </Dropdown.Item>
                                      ) : null}
                                      <Dropdown.Item
                                        id="close"
                                        onAction={() =>
                                          void (async () => {
                                            try {
                                              await topicMutations.setClosed.mutateAsync({
                                                topicId: tp.forum_topic_id,
                                                isClosed: !tp.is_closed,
                                              });
                                              setTopics((prev) =>
                                                (prev ?? []).map((row) =>
                                                  row.forum_topic_id === tp.forum_topic_id
                                                    ? { ...row, is_closed: !tp.is_closed }
                                                    : row,
                                                ),
                                              );
                                            } catch {
                                              setAdminError("Couldn't update topic.");
                                            }
                                          })()
                                        }
                                      >
                                        {tp.is_closed ? (
                                          <>
                                            <LockOpen className="size-3.5" aria-hidden="true" />
                                            Reopen
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="size-3.5" aria-hidden="true" />
                                            Close
                                          </>
                                        )}
                                      </Dropdown.Item>
                                      {!tp.is_general ? (
                                        <Dropdown.Item
                                          id="delete"
                                          className="text-danger"
                                          onAction={() =>
                                            void (async () => {
                                              try {
                                                await topicMutations.remove.mutateAsync(tp.forum_topic_id);
                                                setTopics((prev) =>
                                                  (prev ?? []).filter((row) => row.forum_topic_id !== tp.forum_topic_id),
                                                );
                                              } catch {
                                                setAdminError("Couldn't delete topic.");
                                              }
                                            })()
                                          }
                                        >
                                          <TrashBin className="size-3.5" aria-hidden="true" />
                                          Delete
                                        </Dropdown.Item>
                                      ) : null}
                                    </Dropdown.Menu>
                                  </Dropdown.Popover>
                                </Dropdown>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {photoLightboxIndex !== null && photoLightboxItems.length > 0 ? (
        <PhotoLightbox
          items={photoLightboxItems}
          initialIndex={photoLightboxIndex}
          onClose={() => setPhotoLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}

function ProfileStatRow({
  icon,
  count,
  label,
  emptyLabel,
  onClick,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  emptyLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
        count > 0 ? "cursor-pointer hover:bg-[var(--default)]" : "cursor-default opacity-60"
      }`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--default)] text-[#26A5E4]">
        {icon}
      </span>
      <span className="text-sm text-foreground">
        {count > 0 ? (
          <>
            <span className="font-semibold text-[#26A5E4]">{count.toLocaleString()}</span>{" "}
            <span className="text-foreground/55">{label}</span>
          </>
        ) : (
          <span className="text-foreground/45">{emptyLabel}</span>
        )}
      </span>
    </button>
  );
}
