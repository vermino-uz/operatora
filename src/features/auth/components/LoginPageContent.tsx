import { AuthSplitShell } from "@/features/auth/components/AuthSplitShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export function LoginPageContent() {
  return (
    <AuthSplitShell mode="login">
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[32px]">
          Welcome back
        </h2>
        <p className="text-[14px] leading-[1.5] text-muted">Enter your credentials to sign in.</p>
      </div>
      <LoginForm />
    </AuthSplitShell>
  );
}
