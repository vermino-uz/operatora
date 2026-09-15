import type { InputHTMLAttributes, ReactNode } from "react";

export function AuthField({
  id,
  label,
  aside,
  icon,
  error,
  trailing,
  inputProps,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  icon: ReactNode;
  error?: string;
  trailing?: ReactNode;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium tracking-[0.26px] text-foreground">
          {label}
        </label>
        {aside}
      </div>
      <div
        className={`flex items-center gap-3 rounded-[14px] bg-foreground/[0.04] px-4 py-3.5 transition-colors focus-within:border-accent ${
          error ? "border-2 border-danger" : "border border-foreground/10"
        }`}
      >
        <span className="shrink-0 text-muted">{icon}</span>
        <input
          id={id}
          {...inputProps}
          className={`auth-input min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted/80 disabled:opacity-60 ${inputProps.className ?? ""}`}
        />
        {trailing}
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
