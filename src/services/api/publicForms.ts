import { apiFetch } from "@/services/api/client";
import { normalizePublicForm, type PublicForm, type PublicFormField } from "@/features/forms/publicFormTypes";

/** See `features/forms/publicFormTypes.ts` for the full contract writeup,
 * including the confirmed-missing backend submit route. */
export const publicFormsApi = {
  async get(idOrSlug: string): Promise<PublicForm> {
    const raw = await apiFetch<unknown>(`/public/forms/${encodeURIComponent(idOrSlug)}`, { public: true });
    return normalizePublicForm(raw);
  },

  /** `POST /public/forms/:idOrSlug` — NOT YET IMPLEMENTED on the backend
   * (see `publicFormTypes.ts`). Wired up so the frontend is ready the
   * moment that route ships; until then this call will surface a real
   * `ApiError` (404/501), which the UI shows via `ErrorState` rather than
   * pretending the submission succeeded. */
  async submit(idOrSlug: string, values: Record<string, string | number | boolean>): Promise<void> {
    await apiFetch<void>(`/public/forms/${encodeURIComponent(idOrSlug)}`, {
      method: "POST",
      public: true,
      body: { data: values },
    });
  },
};

export type { PublicForm, PublicFormField };
