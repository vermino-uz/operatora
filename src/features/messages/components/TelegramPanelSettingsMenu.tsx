"use client";

import { useRouter } from "next/navigation";
import { Dropdown, Separator } from "@heroui/react";
import { Gear, Person, Plus, ArrowRotateLeft as Sync, ArrowRightFromSquare } from "@gravity-ui/icons";

import { ROUTES } from "@/constants/routes";
import type { TelegramAccountSession } from "@/services/api/telegramAccount";

export interface TelegramPanelSettingsMenuProps {
  connectionMode: "business_bot" | "user_account";
  hasLinkedSession: boolean;
  accountActive: boolean;
  accountProtocol: "pyrogram" | "tdlib";
  accountSession: TelegramAccountSession | null | undefined;
  canManageAccount: boolean;
  isSyncing: boolean;
  isDisconnecting: boolean;
  onLinkAccount: () => void;
  onNewChat: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  onAutoLeadCreate?: () => void;
}

function accountSubtitle(session: TelegramAccountSession | null | undefined): string | null {
  if (!session) return null;
  return [session.telegram_username ? `@${session.telegram_username}` : null, session.phone_masked].filter(Boolean).join(" · ") || null;
}

export function TelegramPanelSettingsMenu({
  connectionMode,
  hasLinkedSession,
  accountActive,
  accountProtocol,
  accountSession,
  canManageAccount,
  isSyncing,
  isDisconnecting,
  onLinkAccount,
  onNewChat,
  onSync,
  onDisconnect,
  onAutoLeadCreate,
}: TelegramPanelSettingsMenuProps) {
  const router = useRouter();
  const accountName =
    [accountSession?.first_name, accountSession?.last_name].filter(Boolean).join(" ").trim() ||
    (accountSession?.telegram_username ? `@${accountSession.telegram_username}` : null) ||
    accountSession?.phone_masked ||
    "Linked account";

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Telegram settings"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[var(--default)] text-foreground/70 transition-colors hover:bg-background hover:text-foreground dark:border-white/10"
      >
        <Gear className="size-4" aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="min-w-[240px]">
        {hasLinkedSession ? (
          <div className="border-b border-black/10 px-3 py-2.5 dark:border-white/10">
            <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">Connected account</p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{accountName}</p>
            {accountSubtitle(accountSession) ? (
              <p className="truncate text-xs text-foreground/55">{accountSubtitle(accountSession)}</p>
            ) : null}
            <span className="mt-1.5 inline-flex rounded border border-black/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/55 dark:border-white/10">
              {accountProtocol === "tdlib" ? "TDLib" : "Standard"}
            </span>
          </div>
        ) : null}
        <Dropdown.Menu aria-label="Telegram settings" className="min-w-[240px]">
          {hasLinkedSession && accountActive ? (
            <>
              <Dropdown.Item id="new-chat" onAction={onNewChat}>
                <Plus className="size-3.5" aria-hidden="true" />
                New chat
              </Dropdown.Item>
              <Dropdown.Item id="sync" onAction={onSync} isDisabled={isSyncing}>
                <Sync className="size-3.5" aria-hidden="true" />
                {isSyncing ? "Syncing…" : "Sync inbox & folders"}
              </Dropdown.Item>
              <Separator className="my-1" />
            </>
          ) : null}

          {hasLinkedSession && canManageAccount ? (
            <>
              <Dropdown.Item id="logout" onAction={onDisconnect} isDisabled={isDisconnecting} className="text-danger">
                <ArrowRightFromSquare className="size-3.5" aria-hidden="true" />
                {isDisconnecting ? "Logging out…" : "Log out"}
              </Dropdown.Item>
              <Separator className="my-1" />
            </>
          ) : null}

          {connectionMode === "business_bot" && canManageAccount ? (
            <>
              <Dropdown.Item id="link" onAction={onLinkAccount}>
                <Person className="size-3.5" aria-hidden="true" />
                Link Telegram account
              </Dropdown.Item>
              <Separator className="my-1" />
            </>
          ) : null}

          {onAutoLeadCreate ? (
            <>
              <Dropdown.Item id="auto-lead" onAction={onAutoLeadCreate}>
                Auto-create leads
              </Dropdown.Item>
              <Separator className="my-1" />
            </>
          ) : null}

          <Dropdown.Item id="settings" onAction={() => router.push(`${ROUTES.settings}?section=telegram`)}>
            Manage bots in Settings
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
