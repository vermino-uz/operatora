"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeSlash, Lock, Person, Smartphone } from "@gravity-ui/icons";

import { AuthField } from "@/features/auth/components/AuthField";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schema";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { useRequestOtpMutation } from "@/features/auth/hooks/useRequestOtpMutation";
import { ApiError } from "@/types/api";

function signUpErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.statusCode === 400) return error.message || "Check your details and try again.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const submitClass =
  "mt-1 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-accent text-[15px] font-semibold text-accent-foreground transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMutation = useRegisterMutation();
  const requestOtpMutation = useRequestOtpMutation();
  const [otpStep, setOtpStep] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const onSubmitDetails = handleSubmit(async () => {
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
      // Hooks into the pricing/checkout flow's plan-selection query params
      // (`/pricing`'s CTAs link here as `/signup?plan=pro&cycle=yearly`,
      // mirroring the old app's `SignUp.tsx`): a paid plan continues to
      // `/checkout`, otherwise lands on `/welcome?plan=free` — same
      // completion step the old app's signup flow uses, rather than
      // dropping straight into the dashboard with no onboarding step.
      const plan = searchParams.get("plan");
      const cycle = searchParams.get("cycle") === "monthly" ? "monthly" : "yearly";
      if (plan === "pro" || plan === "max") {
        router.replace(`/checkout?plan=${plan}&cycle=${cycle}`);
      } else {
        router.replace("/welcome?plan=free");
      }
    } catch (err) {
      setSubmitError(signUpErrorMessage(err));
    }
  });

  const busy = isSubmitting || registerMutation.isPending || requestOtpMutation.isPending;

  if (otpStep) {
    return (
      <form className="flex flex-col gap-4" onSubmit={onSubmitOtp} noValidate>
        <p className="text-sm text-muted">
          We sent a verification code to{" "}
          <span className="font-medium text-foreground">{getValues("phone").trim()}</span>.
        </p>

        <Controller
          name="otpCode"
          control={control}
          render={({ field, fieldState }) => (
            <AuthField
              id="signup-otp"
              label="Verification code"
              icon={<Lock className="size-[18px]" strokeWidth={1.8} />}
              error={fieldState.error?.message}
              inputProps={{
                ...field,
                inputMode: "numeric",
                maxLength: 6,
                autoComplete: "one-time-code",
                required: true,
                placeholder: "123456",
                disabled: busy,
                className: "tracking-[0.35em]",
              }}
            />
          )}
        />

        {submitError ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {submitError}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={submitClass}>
          {busy ? "Creating account…" : "Verify & create account"}
          {busy ? null : <ArrowRight className="size-4" strokeWidth={2} />}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-muted hover:text-foreground"
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
    <form className="flex flex-col gap-4" onSubmit={onSubmitDetails} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="firstName"
          control={control}
          render={({ field, fieldState }) => (
            <AuthField
              id="signup-first-name"
              label="First name"
              icon={<Person className="size-[18px]" strokeWidth={1.8} />}
              error={fieldState.error?.message}
              inputProps={{
                ...field,
                autoComplete: "given-name",
                required: true,
                placeholder: "Aziz",
                disabled: busy,
              }}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          render={({ field, fieldState }) => (
            <AuthField
              id="signup-last-name"
              label="Last name"
              icon={<Person className="size-[18px]" strokeWidth={1.8} />}
              error={fieldState.error?.message}
              inputProps={{
                ...field,
                autoComplete: "family-name",
                required: true,
                placeholder: "Karimov",
                disabled: busy,
              }}
            />
          )}
        />
      </div>

      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <AuthField
            id="signup-phone"
            label="Phone"
            icon={<Smartphone className="size-[18px]" strokeWidth={1.8} />}
            error={fieldState.error?.message}
            inputProps={{
              ...field,
              type: "tel",
              autoComplete: "tel",
              required: true,
              placeholder: "+998 90 123 45 67",
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
            id="signup-password"
            label="Password"
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
              autoComplete: "new-password",
              required: true,
              placeholder: "At least 8 characters",
              disabled: busy,
            }}
          />
        )}
      />

      {submitError ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? "Sending code…" : "Continue"}
        {busy ? null : <ArrowRight className="size-4" strokeWidth={2} />}
      </button>
    </form>
  );
}
