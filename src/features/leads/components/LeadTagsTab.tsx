"use client";

import { useState } from "react";
import { Button, Input, TextField, Label } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useLeadAssignedTagsQuery, useLeadTagCatalogQuery, useLeadTagMutations } from "@/features/leads/hooks/useLeadTags";
import { leadNewTagSchema } from "@/features/leads/schema";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/** `lead_tags` + `lead_tag_assignments` — click any catalog chip to
 * toggle it on/off this lead (immediate `setLeadTags` write, matching the
 * old frontend's own instant-toggle UX, not a separate "save" step); type a
 * name and press "Create" for one that doesn't exist yet (get-or-create,
 * case-insensitive dedupe server-side). A single search/create input, not a
 * react-hook-form form — there's no multi-field validation here, just a
 * live filter plus one create action gated by `leadNewTagSchema`. */
export function LeadTagsTab({ leadId, isActive }: { leadId: string; isActive: boolean }) {
  const catalogQuery = useLeadTagCatalogQuery(isActive);
  const assignedQuery = useLeadAssignedTagsQuery(leadId, isActive);
  const { createTag, setTags } = useLeadTagMutations(leadId);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const assignedIds = new Set(assignedQuery.data ?? []);
  const catalog = catalogQuery.data ?? [];
  const filter = query.trim();
  const filtered = filter ? catalog.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase())) : catalog;
  const hasExactMatch = catalog.some((t) => t.name.toLowerCase() === filter.toLowerCase());
  const parsedNewTag = leadNewTagSchema.safeParse({ name: filter });

  async function toggleTag(tagId: string) {
    if (setTags.isPending) return;
    setError(null);
    const next = assignedIds.has(tagId) ? [...assignedIds].filter((id) => id !== tagId) : [...assignedIds, tagId];
    try {
      await setTags.mutateAsync(next);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedNewTag.success || createTag.isPending) return;
    setError(null);
    try {
      const tag = await createTag.mutateAsync({ name: parsedNewTag.data.name });
      await setTags.mutateAsync([...assignedIds, tag.id]);
      setQuery("");
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  if (catalogQuery.isLoading || assignedQuery.isLoading) return <LoadingState label="Loading tags…" />;
  if (catalogQuery.isError) return <ErrorState error={catalogQuery.error} onRetry={() => catalogQuery.refetch()} />;
  if (assignedQuery.isError) return <ErrorState error={assignedQuery.error} onRetry={() => assignedQuery.refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs text-foreground/50">This lead&apos;s tags</p>
        <div className="flex flex-wrap gap-2">
          {catalog
            .filter((t) => assignedIds.has(t.id))
            .map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                disabled={setTags.isPending}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <span aria-hidden className="text-foreground/40">
                  ×
                </span>
              </button>
            ))}
          {assignedIds.size === 0 ? <span className="text-sm text-foreground/50">No tags yet</span> : null}
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex items-end gap-2" noValidate>
        <TextField value={query} onChange={setQuery} className="flex-1">
          <Label>Search or create a tag</Label>
          <Input placeholder="e.g. VIP" />
        </TextField>
        {filter && !hasExactMatch ? (
          <Button type="submit" size="sm" variant="primary" isDisabled={!parsedNewTag.success || createTag.isPending}>
            {createTag.isPending ? "Creating…" : `Create "${filter}"`}
          </Button>
        ) : null}
      </form>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div>
        <p className="mb-1 text-xs text-foreground/50">Workspace tag catalog</p>
        <div className="flex flex-wrap gap-2">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              disabled={setTags.isPending}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                assignedIds.has(tag.id) ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
          {filtered.length === 0 ? <span className="text-sm text-foreground/50">No matching tags</span> : null}
        </div>
      </div>
    </div>
  );
}
