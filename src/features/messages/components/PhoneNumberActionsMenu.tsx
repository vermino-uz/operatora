"use client";

import { useState } from "react";
import { Dropdown } from "@heroui/react";
import { Comment, Handset, PersonPlus } from "@gravity-ui/icons";

import { useTelegramPhoneCheckQuery } from "@/features/messages/hooks/useTelegramAccount";
import {
  isPlausiblePhone,
  normalizePhoneForApi,
  normalizePhoneForTel,
  type PhoneNumberActions,
} from "@/features/messages/lib/phoneNumber";

const DEFAULT_LINK_CLASS =
  "break-all text-[#26A5E4] underline underline-offset-2";

export interface PhoneNumberActionsMenuProps {
  display: string;
  phone: string;
  linkClassName?: string;
  actions?: PhoneNumberActions | null;
}

export function PhoneNumberActionsMenu({
  display,
  phone,
  linkClassName,
  actions,
}: PhoneNumberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const normalizedPhone = normalizePhoneForApi(phone);
  const phoneCheck = useTelegramPhoneCheckQuery(normalizedPhone, open && Boolean(actions));

  if (!isPlausiblePhone(phone)) {
    return <>{display}</>;
  }

  const className = linkClassName ?? DEFAULT_LINK_CLASS;
  const telHref = `tel:${normalizePhoneForTel(phone)}`;
  const checkingTelegram = phoneCheck.isLoading || phoneCheck.isFetching;
  const showOpenDm = checkingTelegram || Boolean(phoneCheck.data?.has_telegram);

  if (!actions) {
    return (
      <a
        href={telHref}
        className={className}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {display}
      </a>
    );
  }

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Dropdown.Trigger>
        <button
          type="button"
          className={`${className} inline cursor-pointer border-0 bg-transparent p-0 font-inherit`}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          {display}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu aria-label="Phone number actions" className="min-w-[200px]">
          <Dropdown.Item
            id="create-contact"
            onAction={() => actions.onCreateContact(normalizedPhone)}
          >
            <PersonPlus className="size-3.5" aria-hidden="true" />
            Create contact
          </Dropdown.Item>
          {showOpenDm ? (
            <Dropdown.Item
              id="open-telegram-dm"
              isDisabled={checkingTelegram}
              onAction={() => actions.onOpenTelegramDm(normalizedPhone)}
            >
              <Comment className="size-3.5" aria-hidden="true" />
              {checkingTelegram ? "Checking Telegram…" : "Open Telegram DM"}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item
            id="call"
            onAction={() => {
              window.location.href = telHref;
            }}
          >
            <Handset className="size-3.5" aria-hidden="true" />
            Call
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
