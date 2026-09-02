import type { ReactNode } from "react";

/** Shared horizontal rhythm for auth/marketing pages — mirrors Claude's
 *  `width: calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))`. */
export function AuthPageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[90rem] px-[clamp(2rem,1.43rem+2.86vw,4rem)] ${className}`}
    >
      {children}
    </div>
  );
}
