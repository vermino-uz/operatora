"use client";

import { Button } from "@heroui/react";
import { ApiError } from "@/types/api";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isAuthError) return "Your session has expired. Please sign in again.";
    if (error.isForbidden) return "You don't have permission to view this.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Shared error display for any API-driven view — never leave a feature
 * with a blank screen on failure (rule from frontend_rules memory). */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-10 text-center ${className ?? ""}`}>
      <p className="text-sm text-danger">{messageFor(error)}</p>
      {onRetry ? (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
