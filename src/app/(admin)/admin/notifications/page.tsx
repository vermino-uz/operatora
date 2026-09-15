"use client";

import { useRef, useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";

import { AdminSelect } from "@/features/admin/components/AdminSelect";
import { useSendAdminNotificationMutation, useUploadAdminNotificationImageMutation } from "@/features/admin/hooks/useAdminNotifications";
import type { SendNotificationInput } from "@/features/admin/types";

const TYPE_OPTIONS = [
  { id: "system", label: "System" },
  { id: "message", label: "Message" },
  { id: "lead_update", label: "Lead update" },
];

/**
 * `POST /admin/notifications/send` — real, confirmed against
 * `admin-notifications.controller.ts`. Broadcasts to a single user or
 * every member of a workspace (backend-decided by which id is supplied);
 * ported from the old `pages/SendNotification.tsx`'s target/title/content/
 * type/image form.
 */
export default function AdminSendNotificationPage() {
  const [userId, setUserId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("system");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendM = useSendAdminNotificationMutation();
  const uploadM = useUploadAdminNotificationImageMutation();

  const canSend = title.trim().length > 0 && content.trim().length > 0 && (userId.trim() || workspaceId.trim()) && !sendM.isPending;

  async function handleSend() {
    setError(null);
    setResult(null);
    const input: SendNotificationInput = {
      userId: userId.trim() || undefined,
      workspaceId: workspaceId.trim() || undefined,
      title: title.trim(),
      content: content.trim(),
      type: type as SendNotificationInput["type"],
      imageUrl: imageUrl ?? undefined,
    };
    try {
      const res = await sendM.mutateAsync(input);
      setResult(`Sent to ${res.sent} recipient(s).`);
      setTitle("");
      setContent("");
    } catch {
      setError("Failed to send notification. Please try again.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setError(null);
    try {
      const url = await uploadM.mutateAsync(file);
      setImageUrl(url);
    } catch {
      setError("Image upload failed.");
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Send notification</h1>
        <p className="text-sm text-foreground/60">Send an in-app notification to a specific user or every member of a workspace.</p>
      </div>

      <TextField>
        <Label>User ID (optional)</Label>
        <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Target a single user…" />
      </TextField>
      <TextField>
        <Label>Workspace ID (optional)</Label>
        <Input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="Or target every member of a workspace…" />
      </TextField>
      {!userId.trim() && !workspaceId.trim() ? (
        <p className="text-xs text-warning">Provide a user ID or a workspace ID.</p>
      ) : null}

      <TextField isRequired>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
      </TextField>
      <TextField isRequired>
        <Label>Content</Label>
        <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notification body" />
      </TextField>

      <AdminSelect aria-label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} className="w-48" />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Hero image (optional)</label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="text-sm text-foreground/70" />
        {uploadM.isPending ? <p className="text-xs text-foreground/50">Uploading…</p> : null}
        {imageUrl ? <p className="mt-1 truncate text-xs text-foreground/50">{imageUrl}</p> : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {result ? <p className="text-sm text-success">{result}</p> : null}

      <Button isDisabled={!canSend} onPress={handleSend}>
        {sendM.isPending ? "Sending…" : "Send"}
      </Button>
    </div>
  );
}
