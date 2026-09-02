"use client";

import { useEffect, useMemo, useState } from "react";

import { initialsFor } from "@/features/messages/types";
import { workspaceMemberProfilesApi } from "@/services/api/workspaceMemberProfiles";

export interface SenderProfile {
  name: string;
  initials: string;
}

/** Resolve workspace member display names for outbound message sender ids. */
export function useSenderProfileMap(userIds: string[], workspaceId: string | undefined): Record<string, SenderProfile> {
  const [map, setMap] = useState<Record<string, SenderProfile>>({});
  const idsKey = useMemo(() => [...new Set(userIds.filter(Boolean))].sort().join(","), [userIds]);

  useEffect(() => {
    const ids = idsKey.split(",").filter(Boolean);
    if (!ids.length || !workspaceId) return;

    let cancelled = false;
    void (async () => {
      try {
        const profiles = await workspaceMemberProfilesApi.list(workspaceId, ids);
        if (cancelled || !profiles.length) return;
        setMap((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const p of profiles) {
            if (next[p.id]) continue;
            const name = p.full_name || p.email?.split("@")[0] || "Team member";
            next[p.id] = { name, initials: initialsFor(name) };
            changed = true;
          }
          return changed ? next : prev;
        });
      } catch {
        // Best-effort — UI falls back to generic label.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, workspaceId]);

  return map;
}
