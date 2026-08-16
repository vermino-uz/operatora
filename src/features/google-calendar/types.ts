/**
 * `google-calendar` settings section — traced from the old frontend's
 * `GoogleCalendarIntegration.tsx` / `useGoogleCalendar.ts` /
 * `googleCalendarApi.ts` against the real
 * `google-calendar/google-calendar-oauth.controller.ts` (`/google-calendar/*`).
 *
 * Deliberately per-OPERATOR, not workspace-shared (unlike Google Sheets) —
 * every operator connects their own Google account so meeting invites/Meet
 * links come from their own calendar. Confirmed via the old file's own doc
 * comment and the controller deriving both `workspaceId` and `userId` from
 * the JWT (`user.sub`), not a `workspace_id` query param. The settings UI
 * itself is intentionally small: connect/disconnect only — there is no
 * dedicated event/meeting-management endpoint exposed in the old frontend's
 * settings page (meeting scheduling itself, if built, would consume this
 * connection from elsewhere, out of scope here).
 */
export interface GoogleCalendarStatus {
  connected: boolean;
  google_email: string | null;
}
