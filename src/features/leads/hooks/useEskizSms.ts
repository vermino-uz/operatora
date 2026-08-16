"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { eskizSmsApi } from "@/services/api/eskizSms";
import { ApiError } from "@/types/api";

/**
 * SMS templates + compose (Phase 2c-8) — thin TanStack Query wrappers over
 * `eskizSmsApi` (see that file's header comment for the real `/eskiz/*`
 * contract this is built on). `isAccountMissing()` distinguishes the
 * expected "workspace hasn't connected Eskiz yet" 404 from a real error, so
 * every consumer can render the same "connect it in Settings" `EmptyState`
 * instead of a generic error.
 */
export function isAccountMissing(error: unknown): boolean {
  return error instanceof ApiError && error.isNotFound;
}

export function useEskizAccountQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["eskiz-account"],
    queryFn: () => eskizSmsApi.getAccount(),
    enabled,
  });
}

export function useEskizGuidanceQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["eskiz-guidance"],
    queryFn: () => eskizSmsApi.getGuidance(),
    enabled,
    staleTime: 5 * 60_000, // static pricing, no need to refetch often
  });
}

export function useEskizTemplatesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["eskiz-templates"],
    queryFn: () => eskizSmsApi.listTemplates(),
    enabled,
  });
}

export function useSubmitEskizTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => eskizSmsApi.submitTemplate(content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eskiz-templates"] }),
  });
}

export function useResubmitEskizTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eskizSmsApi.resubmitTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eskiz-templates"] }),
  });
}

export function useSyncEskizTemplatesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eskizSmsApi.syncTemplates(),
    onSuccess: (data) => queryClient.setQueryData(["eskiz-templates"], data),
  });
}

/** Single-lead compose — sends, then links the resulting chat to the lead
 * (see `eskizSmsApi.send`'s doc comment) and invalidates both the lead's SMS
 * tab feed and the account balance (a send spends real balance). */
export function useSendEskizSmsMutation(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { phone: string; template_id: string; text?: string }) => {
      const message = await eskizSmsApi.send(payload);
      await eskizSmsApi.linkChatToLead(message.chat_id, leadId);
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-eskiz-sms", leadId] });
      queryClient.invalidateQueries({ queryKey: ["eskiz-account"] });
    },
  });
}

export function useSendEskizBulkSmsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { boardId: string; template_id: string; columnIds?: string[]; dateFrom?: string | null; dateTo?: string | null }) =>
      eskizSmsApi.sendBulk(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eskiz-account"] }),
  });
}

/** Feeds the lead details drawer's SMS tab — see `LeadSmsTab`'s doc comment
 * for how this is merged with the (separate, read-only) `lead_sms_messages`
 * log. */
export function useLeadEskizSmsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-eskiz-sms", leadId],
    queryFn: () => eskizSmsApi.getMessagesForLead(leadId),
    enabled: enabled && Boolean(leadId),
  });
}
