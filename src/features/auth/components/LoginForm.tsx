"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, FieldError, Input, TextField } from "@heroui/react";

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

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Guard against double-submit (e.g. double-click / double-Enter) beyond
    // HeroUI's own isPending-disabled state — mutation itself is
    // `retry: false` and mutationKey-scoped (see useLoginMutation).
    if (loginMutation.isPending) return;
    setSubmitError(null);
    try {
      await loginMutation.mutateAsync(values);
      router.replace("/dashboard");
    } catch (err) {
      setSubmitError(loginErrorMessage(err));
    }
  });

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      {/* Same "O" mark as AppSidebar's logo/the generated app icon — one
          consistent brand identity across the shell and the icons a
          browser/OS shows, not a separate one-off design. */}
      <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
        <span className="text-xl font-bold">O</span>
      </div>

      {/* No `shadow-*` override here — Card's own `.card` class already
          ships `shadow-surface` (see @heroui/react's card.css); stacking
          another shadow on top of the built-in one is exactly the
          redundant-shadow anti-pattern the design system warns against. */}
      <Card className="w-full">
        <CardHeader className="flex flex-col items-center gap-1 pb-2 text-center">
          <CardTitle>Sign in to Operatora</CardTitle>
          <p className="text-sm text-foreground/60">Welcome back — enter your details to continue.</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            {/* No visible <Label> — aria-label + placeholder only, the
                compact-auth-form pattern the design system explicitly
                sanctions for a clean, minimal login form. `variant="secondary"`
                on both fields since they sit inside an elevated Card
                (Surface) — the default/primary input variant is meant for
                fields on the page background, not nested on a surface. */}
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="username">
                  <Input aria-label="Email or phone" placeholder="Email or phone" variant="secondary" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} type="password" isInvalid={fieldState.invalid} isRequired autoComplete="current-password">
                  <Input aria-label="Password" placeholder="Password" variant="secondary" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />

            {submitError ? (
              <p role="alert" className="text-sm text-danger">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" variant="primary" isDisabled={isSubmitting || loginMutation.isPending} fullWidth>
              {isSubmitting || loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
