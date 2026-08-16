"use client";

import { useCallback, useEffect, useState } from "react";

import { presenceApi } from "@/services/api/presence";
import { subscribeToWorkspacePresence } from "@/services/realtime/subscriptions";
import type { WorkspacePresenceMap } from "@/features/team/types";

/**
 * Live team presence for workspace owners/admins/managers — REST snapshot
 * on mount + `presence_changed` over the existing workspace socket channel.
 * Ported from the old frontend's `useWorkspacePresence` hook. `enabled`
 * should be the caller's own `VIEW_PRESENCE_ROLES` check (see
 * `features/team/types.ts`) so a member without access never fires the
 * (server-403'd) request.
 */
export function useWorkspacePresence(workspaceId: string | null, enabled: boolean) {
  const [presence, setPresence] = useState<WorkspacePresenceMap>({});

  // Render-time "adjust state on prop change" (not a set-state-in-effect) —
  // clears the snapshot whenever presence becomes disabled or the
  // workspace changes, instead of resetting inside the subscribe effect.
  const activeKey = enabled && workspaceId ? workspaceId : null;
  const [trackedKey, setTrackedKey] = useState<string | null>(null);
  if (activeKey !== trackedKey) {
    setTrackedKey(activeKey);
    setPresence({});
  }

  const mergeSnapshot = useCallback((members: WorkspacePresenceMap) => {
    setPresence((prev) => ({ ...prev, ...members }));
  }, []);

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    let cancelled = false;

    presenceApi
      .workspace(workspaceId)
      .then((members) => {
        if (!cancelled) mergeSnapshot(members);
      })
      .catch(() => {
        /* non-fatal — presence is a live enhancement, not core data */
      });

    const unsubscribe = subscribeToWorkspacePresence(workspaceId, (payload) => {
      if (!payload.user_id) return;
      setPresence((prev) => ({
        ...prev,
        [payload.user_id as string]: {
          online: !!payload.online,
          last_seen: payload.last_seen ?? prev[payload.user_id as string]?.last_seen ?? null,
        },
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [workspaceId, enabled, mergeSnapshot]);

  return presence;
}
