"use client";

import { useRef, useState } from "react";
import { Avatar, Button } from "@heroui/react";

import { ApiError } from "@/types/api";
import { LOGO_ALLOWED_MIME, LOGO_MAX_BYTES, logoPathFromPublicUrl } from "@/services/api/settings";
import { useUploadLogoMutation, useRemoveLogoMutation } from "@/features/settings/hooks/useLogoMutation";

function getUserInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "W";
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 413) return "That image is too large (max 5 MB).";
    if (error.isValidationError) return error.message || "That file isn't a supported image type.";
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export interface WorkspaceLogoUploaderProps {
  workspaceId: string;
  workspaceName: string;
  logoUrl: string | null;
  existingCompany: Record<string, unknown>;
}

/** Workspace logo — real upload against `POST /storage/avatars/upload`
 * (5 MB max, jpeg/png/webp/gif, server-enforced — see `services/api/settings.ts`),
 * not the old frontend's raw-Supabase-client path (that codebase actually
 * goes through the same backend via a compat shim; this rebuild calls the
 * real endpoint directly). Client-side size/type checks below are a UX
 * courtesy only — the backend re-validates independently (magic-byte
 * sniffing, not just MIME/extension trust). */
export function WorkspaceLogoUploader({
  workspaceId,
  workspaceName,
  logoUrl,
  existingCompany,
}: WorkspaceLogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadLogo = useUploadLogoMutation(workspaceId);
  const removeLogo = useRemoveLogoMutation(workspaceId);
  const isBusy = uploadLogo.isPending || removeLogo.isPending;

  function handlePickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || isBusy) return;
    setError(null);

    if (!(LOGO_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      setError("Unsupported file type — use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError("That image is too large (max 5 MB).");
      return;
    }

    try {
      await uploadLogo.mutateAsync({ file, workspaceName, existingCompany });
    } catch (err) {
      setError(uploadErrorMessage(err));
    }
  }

  async function handleRemove() {
    if (!logoUrl || isBusy) return;
    setError(null);
    const path = logoPathFromPublicUrl(logoUrl);
    if (!path) {
      setError("Couldn't determine the logo's storage path — try re-uploading instead.");
      return;
    }
    try {
      await removeLogo.mutateAsync({ logoPath: path, workspaceName, existingCompany });
    } catch (err) {
      setError(uploadErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Logo</span>
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {logoUrl ? <Avatar.Image src={logoUrl} alt="" /> : null}
          <Avatar.Fallback>{getUserInitial(workspaceName)}</Avatar.Fallback>
        </Avatar>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" isDisabled={isBusy} onPress={handlePickFile}>
            {uploadLogo.isPending ? "Uploading…" : logoUrl ? "Change" : "Upload"}
          </Button>
          {logoUrl ? (
            <Button size="sm" variant="ghost" isDisabled={isBusy} onPress={handleRemove}>
              {removeLogo.isPending ? "Removing…" : "Remove"}
            </Button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={LOGO_ALLOWED_MIME.join(",")}
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-foreground/40">JPEG, PNG, WebP, or GIF — max 5 MB.</p>
    </div>
  );
}
