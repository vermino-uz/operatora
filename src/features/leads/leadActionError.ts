import { ApiError } from "@/types/api";

/**
 * Shared inline-error formatter for every lead-mutating action in this
 * feature (move/reassign/create/mark-sold/mark-rejected). `context` lets
 * callers on the column-move path surface an honest, more specific message
 * for the known backend limitation documented below, without fabricating
 * detail the response doesn't actually contain.
 */
export function leadActionErrorMessage(error: unknown, context?: "move"): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return error.message || "You don't have permission to do that.";
    if (error.code === "DUPLICATE_LEAD") return error.message;
    if (error.isValidationError) return error.message;
    if (error.isServerError) {
      // Known backend limitation, traced (not assumed) directly in
      // `right-board-controller.service.ts`'s `changeColumn()`: every
      // failure path inside that method — including the deliberate
      // `BadRequestException('FIELD_REQUIRED:...')` gate and the WIP-limit
      // check — is caught by that method's own outer
      // `catch (error) { throw new Error(error?.message) }` and rethrown as
      // a plain `Error`, which loses its `HttpException` status. The
      // backend's global `AllExceptionsFilter` then reports it as a generic
      // 500 "Internal server error" instead of the intended 400 with a
      // parseable message — so this frontend genuinely cannot distinguish
      // "a required field/deadline is missing", "this column's WIP limit
      // was reached", or "a real server error" for this specific endpoint.
      // Mark Sold/Mark Rejected (`sold-leads-list.service.ts`/
      // `rejected-leads-list.service.ts`) do NOT have this bug — their
      // `FIELD_REQUIRED:...` gate reaches the client as a real 400, see
      // `parseFieldRequiredError()` below and `RequireFieldDialog`. Never
      // modify the backend to fix this (out of scope) — this message is the
      // honest, non-guessing best a client can do here.
      return context === "move"
        ? "This move was blocked by a workspace rule — most likely a required field or deadline needs to be set on this lead first, or the column's lead limit was reached. Open the lead to review it, or ask an admin."
        : "Something went wrong on our end. Please try again shortly.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Parses the `FIELD_REQUIRED:field1,field2` shape raised by the automation
 * deadline/required-field gate — real, clean 400s from Mark Sold/Mark
 * Rejected (see `RequireFieldDialog`'s doc comment for why this can't also
 * be used for the column-move endpoint). Returns `null` if the error isn't
 * this shape.
 */
export function parseFieldRequiredError(error: unknown): string[] | null {
  if (!(error instanceof ApiError) || !error.isValidationError) return null;
  const match = /^FIELD_REQUIRED:(.+)$/.exec(error.message);
  if (!match) return null;
  return match[1]
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}
