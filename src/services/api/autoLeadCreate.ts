import { apiFetch } from "@/services/api/client";

/** Channels with per-workspace auto-lead-create routing — traced from
 * `auto-lead-create.controller.ts`. Conversations settings only touches
 * `audio_upload` (mobile call recording uploads). */
export type AutoLeadCreateChannel =
  | "instagram"
  | "telegram"
  | "whatsapp"
  | "sms"
  | "messenger"
  | "audio_upload";

export interface AutoLeadCreateSetting {
  channel: AutoLeadCreateChannel;
  enabled: boolean;
  pipeline_id: string | null;
  stage_id: string | null;
  auto_create_stage: boolean;
}

export const autoLeadCreateApi = {
  async list(workspaceId: string): Promise<AutoLeadCreateSetting[]> {
    const data = await apiFetch<AutoLeadCreateSetting[]>(
      `/auto-lead-create?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return Array.isArray(data) ? data : [];
  },

  async upsert(args: {
    workspaceId: string;
    channel: AutoLeadCreateChannel;
    enabled: boolean;
    pipelineId: string | null;
    stageId: string | null;
    autoCreateStage?: boolean;
  }): Promise<AutoLeadCreateSetting> {
    return apiFetch<AutoLeadCreateSetting>("/auto-lead-create", {
      method: "PUT",
      body: {
        workspace_id: args.workspaceId,
        channel: args.channel,
        enabled: args.enabled,
        pipeline_id: args.pipelineId,
        stage_id: args.stageId,
        auto_create_stage: args.autoCreateStage ?? false,
      },
    });
  },
};
