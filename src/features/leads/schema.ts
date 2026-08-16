import { z } from "zod";

/**
 * Create Lead — matches `CreateAddLeadDto`'s real shape (`add-lead.controller.ts`):
 * only `first_name`/`column_id` are actually required server-side, everything
 * else is optional. `age` stays a string in the form (HeroUI `Input`'s native
 * value type) and is parsed to a number at submit time, not here.
 */
export const createLeadSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(200),
  last_name: z.string().trim().max(200).optional(),
  phone_number: z.string().trim().max(30).optional(),
  age: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 120), "Enter a valid age")
    .optional(),
  marital_status: z.string().optional(),
  academic_status: z.string().optional(),
  column_id: z.string().min(1, "Choose a pipeline stage"),
});
export type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

/** Mark Sold — `note` is optional free text, matches `PATCH .../mark-sold`'s `{note?}`. */
export const markSoldSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});
export type MarkSoldFormValues = z.infer<typeof markSoldSchema>;

/** Mark Rejected — `reason` must be one of the workspace's configured
 * reasons (a `Select`, not free text), matches `PATCH .../mark-rejected`'s
 * mandatory `{reason}`. */
export const markRejectedSchema = z.object({
  reason: z.string().trim().min(1, "Select a rejection reason"),
});
export type MarkRejectedFormValues = z.infer<typeof markRejectedSchema>;

/** One entry in the minimal rejection-reason list manager's "add a reason" input. */
export const addRejectionReasonSchema = z.object({
  reason: z.string().trim().min(1, "Reason text is required").max(200),
});
export type AddRejectionReasonFormValues = z.infer<typeof addRejectionReasonSchema>;

// ============================================================================
// Lead details panel expansion (Phase 2c-4)
// ============================================================================

/** Comments tab composer — matches `leads-comments.controller.ts`'s own
 * validation (`createComment` requires text OR at least one attachment, not
 * necessarily both). */
export const leadCommentSchema = z
  .object({
    content: z.string().trim().max(5000),
    imageUrls: z.array(z.string()),
  })
  .refine((v) => v.content.length > 0 || v.imageUrls.length > 0, {
    message: "Write a comment or attach a file",
    path: ["content"],
  });
export type LeadCommentFormValues = z.infer<typeof leadCommentSchema>;

/** Tags tab "create a new tag" input. */
export const leadNewTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(60),
});
export type LeadNewTagFormValues = z.infer<typeof leadNewTagSchema>;

/** Additional phone numbers (Info tab) — matches `AddLeadPhoneDto`. */
export const leadAdditionalPhoneSchema = z.object({
  phone_number: z.string().trim().min(3, "Enter a phone number").max(30),
  label: z.string().trim().max(120).optional(),
});
export type LeadAdditionalPhoneFormValues = z.infer<typeof leadAdditionalPhoneSchema>;

/** Tasks tab inline "add task" form — matches `TasksController.create`'s
 * real requirements (`title`, valid `due_at`, `task_type` from its fixed
 * allowlist). */
export const LEAD_TASK_TYPES = ["call", "send_info", "meeting", "check_payment", "custom"] as const;
export const leadTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  task_type: z.enum(LEAD_TASK_TYPES),
  due_at: z.string().min(1, "Choose a due date"),
  assigned_operator_id: z.string().optional(),
});
export type LeadTaskFormValues = z.infer<typeof leadTaskSchema>;

/** Tasks tab "mark complete" dialog — `closure_comment` is mandatory
 * server-side (`TasksService.complete()` 400s on empty). */
export const leadTaskCompleteSchema = z.object({
  closure_comment: z.string().trim().min(1, "Add a closing note").max(2000),
});
export type LeadTaskCompleteFormValues = z.infer<typeof leadTaskCompleteSchema>;

// ============================================================================
// Column/board management (Phase 2c-5)
// ============================================================================

/** Create/edit column form — matches `CreateColumnDto`'s real shape.
 * `lead_limit` stays a string in the form (empty = unlimited) and is parsed
 * to a number (or `null`) at submit time, same convention `createLeadSchema`
 * already established for `age`. */
export const columnFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  color: z.string().trim().min(1).max(20),
  description: z.string().trim().max(500).optional(),
  is_hidden: z.boolean(),
  lead_limit: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0), "Enter a positive number, or leave blank for unlimited"),
});
export type ColumnFormValues = z.infer<typeof columnFormSchema>;

/** Create board — matches `CreateBoardDto`'s real shape (`name` only). */
export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});
export type CreateBoardFormValues = z.infer<typeof createBoardSchema>;

// ============================================================================
// Custom fields engine (Phase 2c-6)
// ============================================================================

/** Custom field DEFINITION form — one shared shape for every `field_type`
 * (only the fields relevant to the selected type are actually validated/
 * sent, see `ManageCustomFieldsDialog`'s submit handler); matches
 * `lead-custom-fields.service.ts`'s `validate()` per-type requirements
 * (e.g. select/multi_select/status need ≥1 option, formula needs a
 * non-empty expression, rollup needs a relation field). `optionsText` is a
 * newline-separated editor for list/status options (mirrors the old
 * frontend's own comma/newline option editor UX). */
export const customFieldFormSchema = z.object({
  field_name: z.string().trim().min(1, "Field name is required").max(200),
  field_type: z.string().min(1),
  optionsText: z.string().optional(),
  is_required: z.boolean(),
  required_column_ids: z.array(z.string()),
  amountCurrency: z.enum(["UZS", "USD"]).optional(),
  dateIncludeTime: z.boolean().optional(),
  formulaExpression: z.string().max(1000).optional(),
  formulaDecimals: z.string().optional(),
  formulaFormat: z.enum(["number", "percent", "currency"]).optional(),
  rollupRelationField: z.string().optional(),
  rollupTargetField: z.string().optional(),
  rollupFn: z.enum(["count", "sum", "avg", "min", "max"]).optional(),
});
export type CustomFieldFormValues = z.infer<typeof customFieldFormSchema>;

// ============================================================================
// SMS templates + compose (Phase 2c-8) — see `services/api/eskizSms.ts`
// ============================================================================

/** Submit-a-new-template form (`POST /eskiz/templates`) — only a content
 * string exists server-side, no name/language/variables (see `EskizTemplate`'s
 * doc comment in `types.ts`). */
export const smsTemplateSubmitSchema = z.object({
  content: z.string().trim().min(1, "Template text is required").max(1000),
});
export type SmsTemplateSubmitFormValues = z.infer<typeof smsTemplateSubmitSchema>;

/** Single-lead compose form. `phone` defaults to the lead's own number but
 * stays editable (e.g. to reach an alternate contact); `text` is the
 * optional override sent in place of the approved template's body. */
export const composeSmsSchema = z.object({
  phone: z.string().trim().min(5, "A phone number is required").max(20),
  template_id: z.string().min(1, "Choose a template"),
  text: z.string().trim().max(1000).optional(),
});
export type ComposeSmsFormValues = z.infer<typeof composeSmsSchema>;
