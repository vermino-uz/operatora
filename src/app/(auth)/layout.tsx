export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth matches operatora.ai/auth: a dark split canvas. Forced `dark` so
  // the shell always uses our dark tokens (warm near-black + accent), not
  // the production mint palette, and not the app's light theme.
  return <div className="dark min-h-svh bg-background text-foreground">{children}</div>;
}
