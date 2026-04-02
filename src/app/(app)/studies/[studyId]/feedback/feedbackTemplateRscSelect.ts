import type { Prisma } from "@prisma/client"

/** Shared select for RSC + RPC feedback template reads (no `studyId`). */
export const feedbackTemplateSelect = {
  id: true,
  content: true,
  requiredVariableNames: true,
  createdAt: true,
  updatedAt: true,
} as const

export type FeedbackTemplateRscRow = Prisma.FeedbackTemplateGetPayload<{
  select: typeof feedbackTemplateSelect
}>
