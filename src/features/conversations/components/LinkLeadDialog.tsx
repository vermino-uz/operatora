"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { LinkSlash, Magnifier as Search } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { useDebounce } from "@/hooks/useDebounce";
import { leadSearchApi, type LeadSearchResult } from "@/services/api/leadSearch";
import { useConversationLeadLinkMutations } from "@/features/conversations/hooks/useConversationLeadLink";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { ROUTES } from "@/constants/routes";

export interface LinkLeadDialogProps {
  conversationId: string;
  currentLeadId: string | null;
  onClose: () => void;
}

/**
 * Phase 2c-12 — Conversations-side "Link lead" dialog. Old frontend
 * reference (`components/conversations/LinkLeadDialog.tsx`) read for UX
 * only: it hand-rolled its own Supabase `ilike` search and a raw
 * `authenticatedFetch` lookup for the currently-linked lead. This rebuild
 * reuses the real, already-built `lead-search` endpoint
 * (`leadSearchApi.search`/`byIds`, Phase 2c-6's `relation` custom-field
 * lookup) instead of duplicating a second bounded-scan search — a cleaner,
 * more capable real search (server-side name/phone match, not a
 * client-filtered 300-row page) than the old dialog had.
 */
export function LinkLeadDialog({ conversationId, currentLeadId, onClose }: LinkLeadDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [error, setError] = useState<string | null>(null);
  const { link, unlink } = useConversationLeadLinkMutations(conversationId);

  const currentLeadQuery = useQuery({
    queryKey: ["lead-search-by-ids", currentLeadId],
    queryFn: () => leadSearchApi.byIds([currentLeadId as string]),
    enabled: Boolean(currentLeadId),
    staleTime: 30_000,
  });
  const currentLead = currentLeadQuery.data?.[0] ?? null;

  const trimmed = debouncedSearch.trim();
  const searchQuery = useQuery({
    queryKey: ["lead-search", trimmed],
    queryFn: () => leadSearchApi.search(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });

  async function handleLink(lead: LeadSearchResult) {
    if (link.isPending) return; // guard double-submit
    setError(null);
    try {
      await link.mutateAsync(lead.id);
      onClose();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handleUnlink() {
    if (unlink.isPending) return; // guard double-submit
    setError(null);
    try {
      await unlink.mutateAsync();
      onClose();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Link lead</Modal.Heading>
              <p className="text-sm text-foreground/60">
                Link this conversation to a lead so it shows up on that lead&apos;s Conversations tab.
              </p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {currentLeadId ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground/50">Currently linked</p>
                    {currentLeadQuery.isLoading ? (
                      <p className="text-sm text-foreground/50">Loading…</p>
                    ) : (
                      <p className="truncate text-sm font-medium text-foreground">
                        {currentLead?.name ?? `Lead ${currentLeadId}`}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="danger-soft"
                    isDisabled={unlink.isPending}
                    onPress={() => void handleUnlink()}
                  >
                    <LinkSlash className="size-3.5" aria-hidden="true" />
                    {unlink.isPending ? "Unlinking…" : "Unlink"}
                  </Button>
                </div>
              ) : null}

              <TextField value={search} onChange={setSearch}>
                <Label>{currentLeadId ? "Link a different lead" : "Search leads"}</Label>
                <Input placeholder="Search by name or phone…" />
              </TextField>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-black/[0.08] dark:border-white/[0.12]">
                {trimmed.length < 2 ? (
                  <p className="p-4 text-center text-sm text-foreground/50">
                    <Search className="mx-auto mb-1 size-4" aria-hidden="true" />
                    Type at least 2 characters to search.
                  </p>
                ) : searchQuery.isLoading ? (
                  <LoadingState label="Searching…" />
                ) : searchQuery.isError ? (
                  <p className="p-4 text-center text-sm text-danger">
                    {leadActionErrorMessage(searchQuery.error)}
                  </p>
                ) : (searchQuery.data ?? []).length === 0 ? (
                  <p className="p-4 text-center text-sm text-foreground/50">No leads found for &quot;{trimmed}&quot;.</p>
                ) : (
                  <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {(searchQuery.data ?? []).map((lead) => (
                      <li key={lead.id}>
                        <button
                          type="button"
                          disabled={link.isPending || lead.id === currentLeadId}
                          onClick={() => void handleLink(lead)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {lead.name}
                          {lead.id === currentLeadId ? (
                            <span className="ml-1.5 text-xs text-foreground/40">(currently linked)</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}

              <a href={ROUTES.leads} className="text-xs text-accent hover:underline">
                Open Leads
              </a>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
