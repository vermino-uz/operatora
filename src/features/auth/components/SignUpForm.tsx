"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField } from "@heroui/react";

import { signUpSchema, type SignUpFormValues } from "@/features/auth/schema";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { useRequestOtpMutation } from "@/features/auth/hooks/useRequestOtpMutation";
import { ApiError } from "@/types/api";
import { ROUTES } from "@/constants/routes";

function signUpErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.statusCode === 400) return error.message || "Check your details and try again.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function SignUpForm() {
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const requestOtpMutation = useRequestOtpMutation();
  const [otpStep, setOtpStep] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      otpCode: "",
    },
  });

  const sendOtp = async () => {
    const phone = getValues("phone").trim();
    await requestOtpMutation.mutateAsync({ phone, purpose: "signup" });
    setResendIn(60);
    const timer = window.setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const onSubmitDetails = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await sendOtp();
      setOtpStep(true);
    } catch (err) {
      setSubmitError(signUpErrorMessage(err));
    }
  });

  const onSubmitOtp = handleSubmit(async (values) => {
    if (!values.otpCode || !/^\d{6}$/.test(values.otpCode)) {
      setSubmitError("Enter the 6-digit code we sent to your phone.");
      return;
    }
    setSubmitError(null);
    try {
      const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
      await registerMutation.mutateAsync({
        phone: values.phone.trim(),
        otpCode: values.otpCode,
        password: values.password,
        fullName,
      });
      router.replace("/dashboard");
    } catch (err) {
      setSubmitError(signUpErrorMessage(err));
    }
  });

  const busy =
    isSubmitting || registerMutation.isPending || requestOtpMutation.isPending;

  if (otpStep) {
    return (
      <form className="flex flex-col gap-5" onSubmit={onSubmitOtp} noValidate>
        <p className="text-sm text-foreground/60">
          We sent a verification code to{" "}
          <span className="font-medium text-foreground">{getValues("phone").trim()}</span>.
        </p>

        <Controller
          name="otpCode"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="one-time-code">
              <Label className="text-sm font-medium text-foreground/80">Verification code</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                variant="secondary"
                className="tracking-[0.35em]"
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        {submitError ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" isDisabled={busy} fullWidth>
          {busy ? "Creating account…" : "Verify & create account"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-foreground/60 hover:text-foreground"
            onClick={() => setOtpStep(false)}
            disabled={busy}
          >
            Back
          </button>
          <button
            type="button"
            className="text-accent hover:underline disabled:opacity-50"
            disabled={busy || resendIn > 0}
            onClick={() => void sendOtp().catch((err) => setSubmitError(signUpErrorMessage(err)))}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmitDetails} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="firstName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="given-name">
              <Label className="text-sm font-medium text-foreground/80">First name</Label>
              <Input placeholder="Aziz" variant="secondary" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="family-name">
              <Label className="text-sm font-medium text-foreground/80">Last name</Label>
              <Input placeholder="Karimov" variant="secondary" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      </div>

      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <TextField {...field} isInvalid={fieldState.invalid} isRequired autoComplete="tel">
            <Label className="text-sm font-medium text-foreground/80">Phone</Label>
            <Input type="tel" placeholder="+998 90 123 45 67" variant="secondary" />
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
            autoComplete="new-password"
          >
            <Label className="text-sm font-medium text-foreground/80">Password</Label>
            <Input placeholder="At least 8 characters" variant="secondary" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      {submitError ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" isDisabled={busy} fullWidth>
        {busy ? "Sending code…" : "Continue"}
      </Button>

      <p className="text-center text-sm text-foreground/60">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
