"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  TextArea,
  TextField,
  type UseOverlayStateReturn,
} from "@heroui/react";

import { ApiError } from "@/types/api";
import { contentIdeaSchema, type ContentIdeaFormValues } from "@/features/social-media-advisor/schema";
import { CONTENT_FORMATS, CONTENT_PLATFORMS } from "@/features/social-media-advisor/types";
import { useCreateContentIdeaMutation } from "@/features/social-media-advisor/hooks/useContentIdeas";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage content ideas.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this idea. Please try again.";
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ContentIdeaFormModal({
  workspaceId,
  state,
}: {
  workspaceId: string;
  state: UseOverlayStateReturn;
}) {
  const createMutation = useCreateContentIdeaMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ContentIdeaFormValues>({
    resolver: zodResolver(contentIdeaSchema),
    defaultValues: {
      title: "",
      description: "",
      platform: "instagram",
      format: "short_video",
      hashtags: "",
      topics: "",
      impact_score: 60,
    },
  });

  function handleClose() {
    reset();
    setError(null);
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (createMutation.isPending) return; // guard double-submit
    setError(null);
    try {
      await createMutation.mutateAsync({
        title: values.title,
        description: values.description,
        platform: values.platform,
        format: values.format,
        hashtags: fromCsv(values.hashtags),
        topics: fromCsv(values.topics),
        impact_score: values.impact_score,
      });
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>New content idea</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="title"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Title</Label>
                      <Input placeholder="5 signs you need a CRM" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Description</Label>
                      <TextArea rows={3} placeholder="What the post covers…" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Controller
                    name="platform"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Platform</Label>
                        <Select
                          aria-label="Platform"
                          value={field.value}
                          onChange={(key) => typeof key === "string" && field.onChange(key)}
                          className="mt-1 w-full"
                          isInvalid={fieldState.invalid}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={CONTENT_PLATFORMS.map((p) => ({ id: p, label: p }))}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  <span className="capitalize">{opt.label}</span>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    )}
                  />
                  <Controller
                    name="format"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Format</Label>
                        <Select
                          aria-label="Format"
                          value={field.value}
                          onChange={(key) => typeof key === "string" && field.onChange(key)}
                          className="mt-1 w-full"
                          isInvalid={fieldState.invalid}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={CONTENT_FORMATS.map((f) => ({ id: f, label: f.replace("_", " ") }))}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  <span className="capitalize">{opt.label}</span>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    )}
                  />
                  <Controller
                    name="impact_score"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Impact score</Label>
                        <NumberField
                          aria-label="Impact score"
                          minValue={0}
                          maxValue={100}
                          value={field.value}
                          onChange={field.onChange}
                          isInvalid={fieldState.invalid}
                          className="mt-1 w-full"
                        >
                          <NumberField.Group>
                            <NumberField.Input />
                          </NumberField.Group>
                        </NumberField>
                        {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                      </div>
                    )}
                  />
                </div>

                <Controller
                  name="hashtags"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Hashtags</Label>
                      <Input placeholder="#crm, #sales (comma-separated)" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="topics"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Topics</Label>
                      <Input placeholder="lead management, pricing (comma-separated)" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
