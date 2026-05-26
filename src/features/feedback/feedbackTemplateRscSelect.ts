import type { Prisma } from "@prisma/client"

/** Shared select for RSC + RPC feedback template reads (no `studyId`). */
export const feedbackTemplateSelect = {
  id: true,
  content: true,
  requiredVariableNames: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Full template row shape for server workflows that need the owning study id. */
export const feedbackTemplateFullSelect = {
  ...feedbackTemplateSelect,
  studyId: true,
} as const

export type FeedbackTemplateRscRow = Prisma.FeedbackTemplateGetPayload<{
  select: typeof feedbackTemplateSelect
}>

export type FeedbackTemplateFullRow = Prisma.FeedbackTemplateGetPayload<{
  select: typeof feedbackTemplateFullSelect
}>
