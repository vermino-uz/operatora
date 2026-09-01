"use client";

import { Fragment, type ReactNode } from "react";

import { PhoneNumberActionsMenu } from "@/features/messages/components/PhoneNumberActionsMenu";
import {
  isPlausiblePhone,
  PHONE_SPLIT_RE,
  type PhoneNumberActions,
} from "@/features/messages/lib/phoneNumber";

const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g;
const URL_TEST_RE = /^https?:\/\//;

function linkifyPlainSegment(
  text: string,
  linkClassName: string | undefined,
  phoneActions: PhoneNumberActions | null | undefined,
  keyPrefix: string,
): ReactNode {
  const parts = text.split(PHONE_SPLIT_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1 && isPlausiblePhone(part)) {
      return (
        <PhoneNumberActionsMenu
          key={`${keyPrefix}-phone-${i}`}
          display={part}
          phone={part}
          linkClassName={linkClassName}
          actions={phoneActions}
        />
      );
    }
    return <Fragment key={`${keyPrefix}-text-${i}`}>{part}</Fragment>;
  });
}

/** Turn http(s) URLs and phone numbers in plain message text into interactive links. */
export function linkifyText(
  text: string,
  linkClassName?: string,
  phoneActions?: PhoneNumberActions | null,
): ReactNode {
  const urlParts = text.split(URL_SPLIT_RE);
  return urlParts.map((part, i) =>
    URL_TEST_RE.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName ?? "break-all text-[#26A5E4] underline underline-offset-2"}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <Fragment key={i}>{linkifyPlainSegment(part, linkClassName, phoneActions, String(i))}</Fragment>
    ),
  );
}

export type { PhoneNumberActions };
