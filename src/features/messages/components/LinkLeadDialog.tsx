"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { LinkSlash, Magnifier as Search } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { useDebounce } from "@/hooks/useDebounce";
import { leadSearchApi, type LeadSearchResult } from "@/services/api/leadSearch";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { ROUTES } from "@/constants/routes";

export interface LinkLeadDialogProps {
  currentLeadId: string | null;
  onLink: (leadId: string) => Promise<unknown>;
  onUnlink: () => Promise<unknown>;
  isLinking: boolean;
  isUnlinking: boolean;
  onClose: () => void;
}

/**
 * Shared "link this chat to a lead" dialog — Telegram/Instagram/SMS all
 * have a real, traced `link-lead` endpoint (`telegram-chats.controller`'s
 * `PATCH :id/link-lead`, `instagram.controller`'s `POST conversations/:id/
 * link-lead`, `eskiz.controller`'s `PATCH chats/:id/link-lead`), so one
 * dialog parametrized by mutation callbacks covers all three instead of
 * three near-duplicate copies. Mirrors `features/conversations/components/
 * LinkLeadDialog.tsx`'s exact structure (Phase 2c-12 precedent) — this is
 * the revisit that slice's own writeup flagged: "once the Messages host
 * page exists, revisit whether `LinkChatToLeadDialog` should be added."
 * `CreateLeadFromChatDialog`/`AutoLeadCreateDialog` (the other two old
 * files in that same revisit note) are still deferred — see PROGRESS.md.
 */
export function LinkLeadDialog({ currentLeadId, onLink, onUnlink, isLinking, isUnlinking, onClose }: LinkLeadDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [error, setError] = useState<string | null>(null);

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
    if (isLinking) return;
    setError(null);
    try {
      await onLink(lead.id);
      onClose();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handleUnlink() {
    if (isUnlinking) return;
    setError(null);
    try {
      await onUnlink();
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
              <p className="text-sm text-foreground/60">Link this conversation to a lead.</p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {currentLeadId ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground/50">Currently linked</p>
                    {currentLeadQuery.isLoading ? (
                      <p className="text-sm text-foreground/50">Loading…</p>
                    ) : (
                      <p className="truncate text-sm font-medium text-foreground">{currentLead?.name ?? `Lead ${currentLeadId}`}</p>
                    )}
                  </div>
                  <Button size="sm" variant="danger-soft" isDisabled={isUnlinking} onPress={() => void handleUnlink()}>
                    <LinkSlash className="size-3.5" aria-hidden="true" />
                    {isUnlinking ? "Unlinking…" : "Unlink"}
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
                  <p className="p-4 text-center text-sm text-danger">{leadActionErrorMessage(searchQuery.error)}</p>
                ) : (searchQuery.data ?? []).length === 0 ? (
                  <p className="p-4 text-center text-sm text-foreground/50">No leads found for &quot;{trimmed}&quot;.</p>
                ) : (
                  <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {(searchQuery.data ?? []).map((lead) => (
                      <li key={lead.id}>
                        <button
                          type="button"
                          disabled={isLinking || lead.id === currentLeadId}
                          onClick={() => void handleLink(lead)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {lead.name}
                          {lead.id === currentLeadId ? <span className="ml-1.5 text-xs text-foreground/40">(currently linked)</span> : null}
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
