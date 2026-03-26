import type { Prisma } from "@prisma/client"

/** Shared select for RSC + RPC feedback template reads (no `studyId`). */
export const feedbackTemplateSelect = {
  id: true,
  content: true,
  extractorVersion: true,
  requiredVariableNames: true,
  validatedExtractionId: true,
  validationStatus: true,
  validatedAt: true,
  missingVariableNames: true,
  extraVariableNames: true,
  createdAt: true,
  updatedAt: true,
} as const

export type FeedbackTemplateRscRow = Prisma.FeedbackTemplateGetPayload<{
  select: typeof feedbackTemplateSelect
}>

/** `Json` columns that store `string[]` variable names (narrow without `as`). */
export function jsonColumnToStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}
