"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField } from "@heroui/react";

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

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="username">
            <Label className="text-sm font-medium text-foreground/80">Email or phone</Label>
            <Input placeholder="you@company.com" variant="secondary" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            type="password"
            isInvalid={fieldState.invalid}
            isRequired
            autoComplete="current-password"
          >
            <Label className="text-sm font-medium text-foreground/80">Password</Label>
            <Input placeholder="Enter your password" variant="secondary" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {submitError ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isDisabled={isSubmitting || loginMutation.isPending}
        fullWidth
        className="mt-1"
      >
        {isSubmitting || loginMutation.isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-foreground/60">
        New to Operatora?{" "}
        <a href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </a>
      </p>
    </form>
  );
}
