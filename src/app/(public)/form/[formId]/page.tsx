"use client";

import { use } from "react";

import { PublicFormView } from "@/features/forms/components/PublicFormView";

/**
 * `/form/:formId` — public, unauthenticated form-submission view. See
 * `features/forms/publicFormTypes.ts` for the confirmed backend contract
 * (and the one route that's still missing server-side).
 */
export default function PublicFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  return <PublicFormView formId={formId} />;
}
