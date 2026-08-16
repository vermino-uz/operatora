"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField } from "@heroui/react";

import { ApiError } from "@/types/api";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/state/session-store";
import { tokenStorage } from "@/services/api/token-storage";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import {
  changePasswordSchema,
  confirmPhoneOtpSchema,
  requestPhoneOtpSchema,
  type ChangePasswordFormValues,
  type ConfirmPhoneOtpFormValues,
  type RequestPhoneOtpFormValues,
} from "@/features/security/schema";
import {
  useChangePasswordMutation,
  useConfirmPhoneChangeMutation,
  useForceLogoutMutation,
  useRequestPhoneOtpMutation,
  useSecuritySessionsQuery,
} from "@/features/security/hooks/useSecurityHooks";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isAuthError) return "Your session has expired. Please sign in again.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function ChangePasswordCard() {
  const changePassword = useChangePasswordMutation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (changePassword.isPending) return; // guard double-submit
    setError(null);
    setSuccess(false);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.current_password,
        newPassword: values.new_password,
      });
      reset();
      setSuccess(true);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  });

  return (
    <section className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <h2 className="text-sm font-semibold text-foreground">Change password</h2>
      <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Controller
          name="current_password"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} isRequired>
              <Label>Current password</Label>
              <Input type="password" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="new_password"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                <Label>New password</Label>
                <Input type="password" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <Controller
            name="confirm_password"
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                <Label>Confirm new password</Label>
                <Input type="password" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {success ? <p className="text-sm text-success">Password changed.</p> : null}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" isDisabled={isSubmitting || changePassword.isPending}>
            {isSubmitting || changePassword.isPending ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function ActiveSessionsCard() {
  const router = useRouter();
  const sessionsQuery = useSecuritySessionsQuery();
  const forceLogout = useForceLogoutMutation();
  const clearSession = useSessionStore((s) => s.clear);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleForceLogout = async () => {
    if (forceLogout.isPending) return;
    setError(null);
    try {
      await forceLogout.mutateAsync();
      // The backend just revoked every refresh token, including this
      // session's — end the session locally now rather than waiting for
      // the next 401 to surface it.
      tokenStorage.clear();
      clearSession();
      router.push(ROUTES.login);
    } catch (err) {
      setError(actionErrorMessage(err));
      setConfirming(false);
    }
  };

  return (
    <section className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active sessions</h2>
          <p className="mt-0.5 text-sm text-foreground/60">
            Every device currently signed in to your account.
          </p>
        </div>
        {confirming ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-foreground/60">Sign out everywhere?</span>
            <Button variant="danger" size="sm" isDisabled={forceLogout.isPending} onPress={handleForceLogout}>
              {forceLogout.isPending ? "Signing out…" : "Confirm"}
            </Button>
            <Button variant="secondary" size="sm" onPress={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger-soft" size="sm" className="shrink-0" onPress={() => setConfirming(true)}>
            Sign out all devices
          </Button>
        )}
      </div>

      <div className="mt-4">
        {sessionsQuery.isLoading ? (
          <LoadingState label="Loading sessions…" className="py-6" />
        ) : sessionsQuery.isError ? (
          <ErrorState error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} className="py-6" />
        ) : (sessionsQuery.data ?? []).length === 0 ? (
          <p className="py-4 text-sm text-foreground/50">No active sessions found.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {sessionsQuery.data!.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{session.user_agent || "Unknown device"}</p>
                  <p className="truncate text-xs text-foreground/50">
                    {session.ip_address ?? "Unknown IP"} · Since {new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function PhoneNumberCard() {
  const user = useSessionStore((s) => s.user);
  const requestOtp = useRequestPhoneOtpMutation();
  const confirmOtp = useConfirmPhoneChangeMutation();
  const [step, setStep] = useState<"idle" | "otp-sent">("idle");
  const [pendingPhone, setPendingPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestForm = useForm<RequestPhoneOtpFormValues>({
    resolver: zodResolver(requestPhoneOtpSchema),
    defaultValues: { phone: "" },
  });
  const confirmForm = useForm<ConfirmPhoneOtpFormValues>({
    resolver: zodResolver(confirmPhoneOtpSchema),
    defaultValues: { otp_code: "" },
  });

  const onRequestSubmit = requestForm.handleSubmit(async (values) => {
    if (requestOtp.isPending) return;
    setError(null);
    try {
      await requestOtp.mutateAsync(values.phone.trim());
      setPendingPhone(values.phone.trim());
      setStep("otp-sent");
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  });

  const onConfirmSubmit = confirmForm.handleSubmit(async (values) => {
    if (confirmOtp.isPending) return;
    setError(null);
    try {
      await confirmOtp.mutateAsync({ phone: pendingPhone, otpCode: values.otp_code.trim() });
      setSuccess(true);
      setStep("idle");
      requestForm.reset();
      confirmForm.reset();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  });

  return (
    <section className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <h2 className="text-sm font-semibold text-foreground">Phone number</h2>
      <p className="mt-0.5 text-sm text-foreground/60">
        Current: {user?.phone || "Not set"}. Changing your number requires an SMS verification code.
      </p>

      {step === "idle" ? (
        <form className="mt-4 flex items-end gap-3" onSubmit={onRequestSubmit} noValidate>
          <Controller
            name="phone"
            control={requestForm.control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} className="max-w-xs flex-1">
                <Label>New phone number</Label>
                <Input placeholder="+998 XX XXX XX XX" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <Button type="submit" variant="secondary" isDisabled={requestOtp.isPending}>
            {requestOtp.isPending ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form className="mt-4 flex items-end gap-3" onSubmit={onConfirmSubmit} noValidate>
          <Controller
            name="otp_code"
            control={confirmForm.control}
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} className="max-w-[180px] flex-1">
                <Label>Code sent to {pendingPhone}</Label>
                <Input placeholder="123456" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </TextField>
            )}
          />
          <Button type="submit" variant="primary" isDisabled={confirmOtp.isPending}>
            {confirmOtp.isPending ? "Confirming…" : "Confirm"}
          </Button>
          <Button type="button" variant="secondary" onPress={() => setStep("idle")}>
            Cancel
          </Button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? <p className="mt-3 text-sm text-success">Phone number updated.</p> : null}
    </section>
  );
}

/**
 * Security — traced against `settings-controller/admin-console/
 * security.controller.ts`'s real `/security/*` endpoints: change password,
 * list active sessions + sign out everywhere, and SMS-OTP-verified phone
 * number binding. No 2FA endpoint exists on the backend — not built here.
 */
export function SecuritySettingsPanel() {
  return (
    <SettingsSectionShell
      title="Security"
      subtitle="Change password, active sessions, and sign out other devices."
    >
      <div className="flex flex-col gap-5">
        <ChangePasswordCard />
        <ActiveSessionsCard />
        <PhoneNumberCard />
      </div>
    </SettingsSectionShell>
  );
}
