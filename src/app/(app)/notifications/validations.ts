import { z } from "zod"

export const dataCollectionStartedSchema = z.object({
  studyTitle: z.string(),
  endDate: z.string().optional(),
})

export const studySetupCompletedSchema = z.object({
  studyTitle: z.string(),
  setupCompletedAt: z.string().optional(),
  nextStep: z.string().optional(),
})

export const templateSchemaMap: Record<string, z.ZodSchema<any>> = {
  dataCollectionStarted: dataCollectionStartedSchema,
  studySetupCompleted: studySetupCompletedSchema,
}

export const getTemplateSchema = (templateId: string) => {
  const schema = templateSchemaMap[templateId]
  if (!schema) {
    throw new Error(`No schema found for notification template: ${templateId}`)
  }
  return schema
}

export const validateTemplateData = <T>(
  templateId: string,
  data: unknown
): { success: true; data: T } | { success: false; errors: string } => {
  const schema = getTemplateSchema(templateId)
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map((error) => error.message).join(", ")
    return { success: false, errors }
  }
  return { success: true, data: result.data as T }
}
