/**
 * Storage bucket constraints, mirrored from the backend's
 * `storage-proxy/buckets.ts` (`BUCKETS` map) — kept here so the frontend
 * can fail fast client-side with the same limits the backend actually
 * enforces, per ARCHITECTURE.md's API/Service Layer Contract ("File
 * uploads: a shared `uploadFile(bucket, file, opts)` helper... enforcing
 * the same client-side size/mime constraints the backend already enforces
 * per bucket"). This is a UX courtesy only — the backend re-validates
 * independently (magic-byte sniffing for images, not just MIME/extension
 * trust) and remains the real authorization/validation boundary.
 *
 * Only buckets this frontend actually uploads to are listed; add more as
 * features that upload to them get built (avatars is currently still an
 * inline constant in `services/api/settings.ts` — not migrated here to
 * avoid an unrelated refactor of working code, but new upload call sites
 * should use `UPLOAD_CONSTRAINTS` + `uploadFile()` from
 * `services/api/uploadFile.ts` going forward).
 */
export interface BucketUploadConstraints {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export const UPLOAD_CONSTRAINTS = {
  /**
   * `generated-media` bucket's OWN limit is 25 MB / png+jpeg+webp+mp4 (see
   * backend `buckets.ts`), but the actual route this frontend calls —
   * `POST /generated-media/upload` (source-photo upload for Gallery) —
   * layers a STRICTER multer limit on top: 15 MB, and its service
   * (`generated-media.service.ts#uploadSource`) only accepts
   * png/jpeg/webp (no video — uploads are always still images). The
   * stricter, actually-enforced-for-this-route limit is what's used here,
   * not the bucket's general ceiling, to avoid the UI accepting a file the
   * backend will 413/400 on.
   */
  generatedMediaUpload: {
    maxSizeBytes: 15 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  } satisfies BucketUploadConstraints,
} as const;
