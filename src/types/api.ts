/**
 * Shared response/error envelope types for the API layer. Every backend
 * response, regardless of which of the old system's shapes it came in as,
 * gets normalized to these before reaching feature code.
 */

/** Normalized internal error shape thrown by `apiFetch`. Never expose a raw
 * fetch/Response/axios error to feature code — always catch/throw this. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly path?: string;
  readonly timestamp?: string;
  /** True for network-level failures (offline, DNS, timeout) — no HTTP
   * response was ever received, so `statusCode` is 0. */
  readonly isNetworkError: boolean;

  constructor(params: {
    statusCode: number;
    message: string;
    code?: string;
    path?: string;
    timestamp?: string;
    isNetworkError?: boolean;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.path = params.path;
    this.timestamp = params.timestamp;
    this.isNetworkError = params.isNetworkError ?? false;
  }

  get isAuthError(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isValidationError(): boolean {
    return this.statusCode === 400;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /** HTTP 402 — monthly AI credits exhausted for a feature. */
  get isPaymentRequired(): boolean {
    return this.statusCode === 402;
  }

  get isAiCreditsExhausted(): boolean {
    return this.code === "AI_CREDITS_EXHAUSTED" || (this.isPaymentRequired && this.code !== "AI_FEATURE_DISABLED");
  }

  get isAiFeatureDisabled(): boolean {
    return this.code === "AI_FEATURE_DISABLED";
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/** Raw shape produced by the backend's global `AllExceptionsFilter`. */
export interface RawApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
  code?: string;
  [key: string]: unknown;
}

/** One internal pagination shape every list endpoint gets normalized into,
 * regardless of which of the old API's two envelope conventions it used. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
