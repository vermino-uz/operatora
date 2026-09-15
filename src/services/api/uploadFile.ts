import { apiFetch, type ApiRequestOptions } from "@/services/api/client";
import type { BucketUploadConstraints } from "@/constants/buckets";

/**
 * Shared multipart-upload helper — the `uploadFile(bucket, file, opts)`
 * seam ARCHITECTURE.md's API/Service Layer Contract calls for ("enforcing
 * the same client-side size/mime constraints the backend already enforces
 * per bucket — fail fast in the UI rather than round-tripping a guaranteed
 * -400"). Built here because Gallery's source-photo upload
 * (`POST /generated-media/upload`) is the first upload call site in this
 * rebuild that needed one; `services/api/settings.ts`'s existing avatar
 * logo upload predates this helper and is left as-is (not an unrelated
 * refactor target for this change) but new call sites should use this.
 *
 * Deliberately takes a plain `path` rather than a literal storage "bucket"
 * name: some upload endpoints in this backend go through the generic
 * `/storage/:bucket/upload` proxy, others (like `generated-media`) have
 * their own dedicated feature controller route with its own, sometimes
 * stricter, limits (see `constants/buckets.ts`). Both shapes are a plain
 * multipart POST, so one helper covers both.
 */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

/** Throws `FileValidationError` (never a raw string) if the file fails the
 * given constraints — callers should catch this distinctly from `ApiError`
 * since no request was ever sent. */
export function validateFile(file: File, constraints: BucketUploadConstraints): void {
  if (!constraints.allowedMimeTypes.includes(file.type)) {
    throw new FileValidationError(
      `Unsupported file type "${file.type || "unknown"}". Allowed: ${constraints.allowedMimeTypes.join(", ")}.`,
    );
  }
  if (file.size > constraints.maxSizeBytes) {
    const maxMb = (constraints.maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new FileValidationError(`File is too large. Maximum size is ${maxMb} MB.`);
  }
}

export interface UploadFileOptions extends Omit<ApiRequestOptions, "body" | "method"> {
  /** multipart field name the endpoint expects the file under. Defaults to `"file"`. */
  fieldName?: string;
  /** Additional string fields to append to the same `FormData` body. */
  extraFields?: Record<string, string>;
  /** Client-side pre-flight check — validated before any request is sent. */
  constraints?: BucketUploadConstraints;
}

/** Uploads a single file as `multipart/form-data` via the centralized
 * `apiFetch` (so auth headers / 401-retry / error normalization all still
 * apply — no bespoke `fetch` call). */
export async function uploadFile<T>(path: string, file: File, opts: UploadFileOptions = {}): Promise<T> {
  if (opts.constraints) validateFile(file, opts.constraints);

  const form = new FormData();
  form.append(opts.fieldName ?? "file", file);
  if (opts.extraFields) {
    for (const [key, value] of Object.entries(opts.extraFields)) {
      form.append(key, value);
    }
  }

  const { fieldName: _fieldName, extraFields: _extraFields, constraints: _constraints, ...rest } = opts;
  return apiFetch<T>(path, { ...rest, method: "POST", body: form });
}
