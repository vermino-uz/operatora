"use client";

import { useState } from "react";
import { Button, Chip, Modal, useOverlayState } from "@heroui/react";
import { Calendar, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useDisconnectGoogleCalendarMutation,
  useGoogleCalendarOAuthUrlMutation,
  useGoogleCalendarStatusQuery,
} from "@/features/google-calendar/hooks/useGoogleCalendar";
import { openOAuthPopup } from "@/lib/oauthPopup";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Google Calendar — per-operator connect/disconnect only. See
 * `features/google-calendar/types.ts` for the full contract trace.
 *
 * OAuth flow: opens a popup at Google's consent screen, which redirects to
 * this app's standalone `/google-calendar-callback` route; that page
 * exchanges the code and — if it detects it's still inside a popup
 * (`window.opener` present) — posts a `postMessage` back and closes itself,
 * reusing the same popup+callback-page shape established by Instagram.
 * Unlike Instagram, the backend's `GoogleOAuthUrlDto`/state encoding has no
 * `popup` field to round-trip through Google's redirect (confirmed by
 * reading `google-calendar.service.ts`'s `encodeState`/`decodeState`), so
 * popup-vs-full-navigation is detected at runtime via `window.opener`
 * instead of a backend-echoed flag — a purely client-side signal that needs
 * no backend cooperation.
 */
export function GoogleCalendarSettingsPanel() {
  const statusQuery = useGoogleCalendarStatusQuery(true);
  const oauthUrl = useGoogleCalendarOAuthUrlMutation();
  const disconnect = useDisconnectGoogleCalendarMutation();
  const [error, setError] = useState<string | null>(null);
  const disconnectDialog = useOverlayState();

  async function handleConnect() {
    if (oauthUrl.isPending) return;
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/google-calendar-callback`;
      const { authUrl } = await oauthUrl.mutateAsync(redirectUri);
      const popup = openOAuthPopup(authUrl, "operatora-google-calendar-oauth");
      if (!popup) {
        window.location.href = authUrl;
        return;
      }
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          void statusQuery.refetch();
        }
      }, 500);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDisconnect() {
    if (disconnect.isPending) return;
    setError(null);
    try {
      await disconnect.mutateAsync();
      disconnectDialog.close();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  const shellProps = {
    title: "Google Calendar",
    subtitle: "Connect your own Google account to generate Meet links for scheduled meetings.",
  } as const;

  if (statusQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Google Calendar status…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (statusQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const status = statusQuery.data;

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="flex flex-col gap-4">
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {!status?.connected ? (
          <div>
            <Button isDisabled={oauthUrl.isPending} onPress={handleConnect}>
              <Calendar className="size-4" aria-hidden="true" />
              {oauthUrl.isPending ? "Opening Google…" : "Connect Google Calendar"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
            <div className="flex items-center gap-2">
              <Chip size="sm" color="success" variant="soft">
                <Chip.Label>Connected</Chip.Label>
              </Chip>
              <span className="text-sm text-foreground/70">{status.google_email ?? "Account connected"}</span>
            </div>
            <Button size="sm" variant="danger-soft" onPress={() => disconnectDialog.open()}>
              <TrashBin className="size-3.5" aria-hidden="true" />
              Disconnect
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={disconnectDialog.isOpen} onOpenChange={(open) => !open && disconnectDialog.close()}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Disconnect Google Calendar?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  Removes calendar access for this account. Existing calendar events are not deleted.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" isDisabled={disconnect.isPending} onPress={() => disconnectDialog.close()}>
                  Cancel
                </Button>
                <Button variant="danger" isDisabled={disconnect.isPending} onPress={handleDisconnect}>
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </SettingsSectionShell>
  );
}
