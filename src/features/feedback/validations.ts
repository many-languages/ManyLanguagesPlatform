import { z } from "zod"

export const MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH = 512_000

export const CreateFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
  content: z
    .string()
    .min(1, "Template content cannot be empty")
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH, "Template is too large to save."),
  requiredVariableNames: z.array(z.string()).optional(),
})

export const UpdateFeedbackTemplateSchema = z.object({
  id: z.number().int().positive(),
  content: z
    .string()
    .min(1, "Template content cannot be empty")
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH, "Template is too large to save."),
  requiredVariableNames: z.array(z.string()).optional(),
})

export const GetFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
})

/** Live Step 6 preview via `renderFeedbackPreviewAction` (server-stored context, not client JATOS JSON). */
export const RenderFeedbackPreviewActionSchema = z.object({
  studyId: z.number().int().positive(),
  contextKey: z.string().min(1).max(128),
  templateContent: z
    .string()
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH, "Template is too large to preview."),
  withinStudyResultId: z.number().int().positive().optional(),
})

const SaveFeedbackTemplateActionEnvelopeSchema = z.object({
  studyId: z.number().int().positive(),
  content: z.string(),
  initialTemplate: z
    .object({
      id: z.number().int().positive(),
      content: z.string(),
    })
    .optional()
    .nullable(),
})

export type SaveFeedbackTemplateActionInput = {
  studyId: number
  content: string
  initialTemplate?: { id: number; content: string } | null
}

export type ParseSaveFeedbackTemplateActionResult =
  | { success: true; data: SaveFeedbackTemplateActionInput }
  | { success: false; error: string }

/**
 * Validates server-action save input using Create/Update template schemas.
 * Trims content before schema checks so create vs update share one ruleset.
 */
export function parseSaveFeedbackTemplateActionInput(
  input: unknown
): ParseSaveFeedbackTemplateActionResult {
  const envelope = SaveFeedbackTemplateActionEnvelopeSchema.safeParse(input)
  if (!envelope.success) {
    return {
      success: false,
      error: envelope.error.errors[0]?.message ?? "Invalid feedback template input.",
    }
  }

  const { studyId, content, initialTemplate } = envelope.data
  const trimmedContent = content.trim()

  if (initialTemplate) {
    const parsed = UpdateFeedbackTemplateSchema.safeParse({
      id: initialTemplate.id,
      content: trimmedContent,
    })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid feedback template input.",
      }
    }
  } else {
    const parsed = CreateFeedbackTemplateSchema.safeParse({
      studyId,
      content: trimmedContent,
    })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid feedback template input.",
      }
    }
  }

  return {
    success: true,
    data: {
      studyId,
      content: trimmedContent,
      initialTemplate: initialTemplate ?? undefined,
    },
  }
}

export type CreateFeedbackTemplateInput = z.infer<typeof CreateFeedbackTemplateSchema>
export type UpdateFeedbackTemplateInput = z.infer<typeof UpdateFeedbackTemplateSchema>
export type GetFeedbackTemplateInput = z.infer<typeof GetFeedbackTemplateSchema>
export type RenderFeedbackPreviewActionInput = z.infer<typeof RenderFeedbackPreviewActionSchema>
