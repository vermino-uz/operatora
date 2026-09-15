import { apiFetch } from "@/services/api/client";
import type { AdminOverviewResponse } from "@/features/admin/types";

/** `GET /admin/overview` — confirmed against `admin-overview.service.ts`. */
export const adminOverviewApi = {
  get(): Promise<AdminOverviewResponse> {
    return apiFetch<AdminOverviewResponse>("/admin/overview");
  },
};
