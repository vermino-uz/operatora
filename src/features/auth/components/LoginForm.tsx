"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Envelope, Eye, EyeSlash, Lock } from "@gravity-ui/icons";

import { AuthField } from "@/features/auth/components/AuthField";
import { loginSchema, type LoginFormValues } from "@/features/auth/schema";
import { useLoginMutation } from "@/features/auth/hooks/useLoginMutation";
import { ApiError } from "@/types/api";

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return error.message || "This account is temporarily locked.";
    if (error.statusCode === 401) return "Incorrect email/phone or password.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLoginMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgotNote, setForgotNote] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isSubmitting || loginMutation.isPending;

  const onSubmit = handleSubmit(async (values) => {
    if (loginMutation.isPending) return;
    setSubmitError(null);
    try {
      await loginMutation.mutateAsync(values);
      router.replace(safeNextPath(searchParams.get("next")));
    } catch (err) {
      setSubmitError(loginErrorMessage(err));
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <AuthField
            id="signin-email"
            label="Email or phone number"
            icon={<Envelope className="size-[18px]" strokeWidth={1.8} />}
            error={fieldState.error?.message}
            inputProps={{
              ...field,
              type: "text",
              autoComplete: "username",
              required: true,
              placeholder: "aziz@operatora.uz or +998 90 123 45 67",
              disabled: busy,
            }}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <AuthField
            id="signin-password"
            label="Password"
            aside={
              <button
                type="button"
                onClick={() => setForgotNote(true)}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Forgot?
              </button>
            }
            icon={<Lock className="size-[18px]" strokeWidth={1.8} />}
            error={fieldState.error?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="shrink-0 text-muted transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeSlash className="size-[18px]" strokeWidth={1.8} />
                ) : (
                  <Eye className="size-[18px]" strokeWidth={1.8} />
                )}
              </button>
            }
            inputProps={{
              ...field,
              type: showPassword ? "text" : "password",
              autoComplete: "current-password",
              required: true,
              placeholder: "••••••••••",
              disabled: busy,
            }}
          />
        )}
      />

      {forgotNote ? (
        <p className="text-[12px] leading-relaxed text-muted">
          Ask your workspace admin to reset your password. Self-serve reset is not available on this
          screen yet.
        </p>
      ) : null}

      <div className="flex items-center gap-2.5 pt-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={remember}
          onClick={() => setRemember((v) => !v)}
          className="inline-flex cursor-pointer select-none items-center gap-2.5"
        >
          <span
            className={`flex size-[18px] shrink-0 items-center justify-center rounded-[6px] transition-colors ${
              remember ? "bg-accent text-accent-foreground" : "border border-foreground/20 bg-foreground/[0.04]"
            }`}
          >
            {remember ? (
              <svg
                className="size-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="2.5 6.5 5 9 9.5 3.5" />
              </svg>
            ) : null}
          </span>
          <span className="text-[13px] font-medium text-foreground">Remember me (30 days)</span>
        </button>
      </div>

      {submitError ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-accent text-[15px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
        {busy ? null : <ArrowRight className="size-4" strokeWidth={2} />}
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-1">
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="text-[12px] font-medium tracking-[0.24px] text-muted">
          SSL encrypted · Your data is safe
        </span>
      </div>
    </form>
  );
}
