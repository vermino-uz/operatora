"use client";

import { Spinner } from "@heroui/react";

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 ${className ?? ""}`}>
      <Spinner size="lg" aria-label={label} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
