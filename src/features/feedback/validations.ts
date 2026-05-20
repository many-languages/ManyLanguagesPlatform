import { z } from "zod"

export const MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH = 512_000

export const CreateFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
  content: z
    .string()
    .min(1, "Template content cannot be empty")
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH),
  requiredVariableNames: z.array(z.string()).optional(),
})

export const UpdateFeedbackTemplateSchema = z.object({
  id: z.number().int().positive(),
  content: z
    .string()
    .min(1, "Template content cannot be empty")
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH),
  requiredVariableNames: z.array(z.string()).optional(),
})

export const GetFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
})

export const PreviewFeedbackSchema = z.object({
  template: z.string().min(1),
  enrichedResult: z.any(),
})

/** Server action input for create-or-update feedback template workflow. */
export const SaveFeedbackTemplateActionSchema = z.object({
  studyId: z.number().int().positive(),
  content: z
    .string()
    .max(MAX_FEEDBACK_TEMPLATE_CONTENT_LENGTH, "Template is too large to save.")
    .refine((s) => s.trim().length > 0, "Please enter some content for your feedback template."),
  initialTemplate: z
    .object({
      id: z.number().int().positive(),
      content: z.string(),
    })
    .optional()
    .nullable(),
})

export type CreateFeedbackTemplateInput = z.infer<typeof CreateFeedbackTemplateSchema>
export type UpdateFeedbackTemplateInput = z.infer<typeof UpdateFeedbackTemplateSchema>
export type GetFeedbackTemplateInput = z.infer<typeof GetFeedbackTemplateSchema>
export type PreviewFeedbackInput = z.infer<typeof PreviewFeedbackSchema>
