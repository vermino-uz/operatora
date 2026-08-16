import type { ComponentPropsWithRef, ReactNode } from "react";

import { Button, Tooltip } from "@heroui/react";

type ButtonProps = ComponentPropsWithRef<typeof Button>;

export interface IconButtonProps extends Omit<ButtonProps, "children" | "isIconOnly"> {
  /** Accessible label AND default tooltip text. */
  label: string;
  /** Override the tooltip content if it should differ from the aria-label. */
  tooltip?: ReactNode;
  children: ReactNode;
}

/**
 * Icon-only `Button` + `Tooltip`, bundled so every icon button in this app
 * carries an aria-label and a tooltip without repeating the same two-component
 * wrapper at every call site (previously hand-rolled per-feature — e.g. the
 * Leads toolbar, AI Chat's attachment button — this replaces that
 * boilerplate). Delay defaults to 200ms, matching the delay already used at
 * every existing `Tooltip` call site in this codebase.
 */
export function IconButton({ children, label, tooltip, delay = 200, ...buttonProps }: IconButtonProps & { delay?: number }) {
  return (
    <Tooltip delay={delay}>
      <Button isIconOnly aria-label={label} {...buttonProps}>
        {children}
      </Button>
      <Tooltip.Content placement="top">{tooltip ?? label}</Tooltip.Content>
    </Tooltip>
  );
}
