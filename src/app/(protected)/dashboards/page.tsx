"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import {
  useDashboardListQuery,
  useDashboardMetaQuery,
  useDashboardQuery,
  useGenerateDashboardMutation,
} from "@/features/dashboards/hooks/useDashboards";
import { DashboardCreator } from "@/features/dashboards/components/DashboardCreator";
import { DashboardGrid } from "@/features/dashboards/components/DashboardGrid";
import { DashboardView } from "@/features/dashboards/components/DashboardView";

/**
 * AI Dashboards (`/dashboards`) — reference: old frontend's `pages/
 * AIDashboards.tsx`. RBAC-gated by the `ai_dashboards` module server-side
 * (`GET /custom-dashboards*`) — a 403 here means the caller's workspace
 * role/RBAC role lacks `view` on that module; surfaced via a plain message,
 * not a spinner or blank page. Generate/edit/delete are additionally
 * workspace-owner-only (server-enforced, independent of the module gate) —
 * `meta.isOwner` (server-computed) drives `canCreate`/the edit panel/delete
 * button, not a client-side role approximation.
 */
export default function AiDashboardsPage() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forceCreator, setForceCreator] = useState(false);

  const metaQuery = useDashboardMetaQuery();
  const listQuery = useDashboardListQuery();
  const detailQuery = useDashboardQuery(selectedId);
  const generateMutation = useGenerateDashboardMutation();

  const meta = metaQuery.data;
  const dashboards = listQuery.data ?? [];
  const canCreate = meta?.canCreate ?? false;

  const handleGenerate = (prompt: string) => {
    generateMutation.mutate(prompt, {
      onSuccess: (res) => {
        setForceCreator(false);
        setSelectedId(res.dashboard.id);
      },
    });
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="No workspace selected" description="Sign in to a workspace to view dashboards." />
      </div>
    );
  }

  if (metaQuery.isError) {
    const forbidden = metaQuery.error instanceof ApiError && metaQuery.error.isForbidden;
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title={forbidden ? "You don't have access to AI Dashboards" : "Couldn't load AI Dashboards"}
          description={
            forbidden
              ? "Ask a workspace owner or admin to grant you access to this module."
              : "Something went wrong. Please try again."
          }
          action={
            !forbidden ? (
              <Button variant="secondary" size="sm" onPress={() => metaQuery.refetch()}>
                Retry
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const loading = metaQuery.isLoading || listQuery.isLoading;

  let body: React.ReactNode;
  if (selectedId) {
    if (detailQuery.isError) {
      body = (
        <Centered>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Couldn&apos;t load this dashboard.</p>
            <Button variant="secondary" size="sm" className="mt-3" onPress={() => setSelectedId(null)}>
              Back
            </Button>
          </div>
        </Centered>
      );
    } else if (detailQuery.isLoading || !detailQuery.data) {
      body = (
        <Centered>
          <Spinner size="lg" aria-label="Loading dashboard" />
        </Centered>
      );
    } else {
      body = (
        <DashboardView
          dashboard={detailQuery.data.dashboard}
          resolved={detailQuery.data.resolved}
          isOwner={meta?.isOwner ?? false}
          onBack={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      );
    }
  } else if (loading) {
    body = (
      <Centered>
        <Spinner size="lg" aria-label="Loading dashboards" />
      </Centered>
    );
  } else if (listQuery.isError) {
    body = (
      <Centered>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Couldn&apos;t load your dashboards.</p>
          <Button variant="secondary" size="sm" className="mt-3" onPress={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      </Centered>
    );
  } else if (forceCreator || dashboards.length === 0) {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DashboardCreator generating={generateMutation.isPending} canCreate={canCreate} onGenerate={handleGenerate} />
        {generateMutation.isError ? (
          <div className="mx-auto max-w-[860px] px-6">
            <p role="alert" className="text-center text-sm text-danger">
              {generateMutation.error instanceof ApiError && generateMutation.error.code === "plan_limit"
                ? generateMutation.error.message
                : "Couldn't generate the dashboard. Please try again."}
            </p>
          </div>
        ) : null}
      </div>
    );
  } else {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DashboardGrid dashboards={dashboards} meta={meta} onOpen={setSelectedId} onCreate={() => setForceCreator(true)} />
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-col">{body}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>;
}
