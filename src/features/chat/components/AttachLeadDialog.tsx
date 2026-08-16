"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { Magnifier as Search } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { useDebounce } from "@/hooks/useDebounce";
import { leadSearchApi, type LeadSearchResult } from "@/services/api/leadSearch";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

export interface AttachLeadDialogProps {
  onSelect: (lead: LeadSearchResult) => void;
  onClose: () => void;
}

/**
 * Phase 2c-12 — AI Chat's "attach a lead as context" picker. Old frontend
 * reference: `components/dashboard/DashboardAttachLeadDialog.tsx`
 * (`Dashboard.tsx`'s `leadPickerOpen`/`leadRefChip`). Traced directly: this
 * is not a lead-creation or lead-linking write — selecting a lead just adds
 * a removable chip, and on send `ChatComposer` prepends a
 * `[Lead context: name (id: id)]` line to the plain-text message before it
 * reaches `/ai-chat/v2` (see that file's own comment and
 * `buildMessageWithContext()` in the old frontend, read for the exact text
 * convention). No new backend endpoint — reused `leadSearchApi.search`
 * (Phase 2c-6's real `lead-search` endpoint) instead of the old dialog's
 * own ad-hoc Supabase `ilike` query.
 */
export function AttachLeadDialog({ onSelect, onClose }: AttachLeadDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const trimmed = debouncedSearch.trim();

  const searchQuery = useQuery({
    queryKey: ["lead-search", trimmed],
    queryFn: () => leadSearchApi.search(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Attach a lead</Modal.Heading>
              <p className="text-sm text-foreground/60">
                Give the assistant context about a specific lead for this message.
              </p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <TextField value={search} onChange={setSearch} autoFocus>
                <Label>Search leads</Label>
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
                          onClick={() => {
                            onSelect(lead);
                            onClose();
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)]"
                        >
                          {lead.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
