import Link from "next/link";

import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";

export function AuthHeader() {
  return (
    <header className="relative z-40 shrink-0">
      <AuthPageContainer>
        <Link
          href="/"
          aria-label="Operatora home"
          className="flex h-[4.5rem] items-center min-[69rem]:h-[5.25rem]"
        >
          <span className="text-lg font-semibold tracking-tight text-foreground">Operatora</span>
        </Link>
      </AuthPageContainer>
    </header>
  );
}
