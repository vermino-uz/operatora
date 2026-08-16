export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // `bg-background` (the theme token, not a hardcoded zinc/black pair) so
    // this actually follows the app's light/dark theme instead of its own
    // disconnected color choice.
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background p-6">
      {/* Soft accent glow — purely decorative, matches the theme's --accent
          token so it stays coherent if the theme is retuned. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
