import { z } from "zod"

export const CreateFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
  content: z.string().min(1, "Template content cannot be empty"),
  requiredVariableKeys: z.array(z.string()).optional(),
})

export const UpdateFeedbackTemplateSchema = z.object({
  id: z.number().int().positive(),
  content: z.string().min(1, "Template content cannot be empty"),
  requiredVariableKeys: z.array(z.string()).optional(),
})

export const GetFeedbackTemplateSchema = z.object({
  studyId: z.number().int().positive(),
})

export const PreviewFeedbackSchema = z.object({
  template: z.string().min(1),
  enrichedResult: z.any(),
})

export type CreateFeedbackTemplateInput = z.infer<typeof CreateFeedbackTemplateSchema>
export type UpdateFeedbackTemplateInput = z.infer<typeof UpdateFeedbackTemplateSchema>
export type GetFeedbackTemplateInput = z.infer<typeof GetFeedbackTemplateSchema>
export type PreviewFeedbackInput = z.infer<typeof PreviewFeedbackSchema>
