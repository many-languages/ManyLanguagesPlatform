import { cache } from "react"
import { getFeedbackTemplateRsc } from "./getFeedbackTemplate"
import { computeFeedbackTemplateValidation } from "./computeFeedbackTemplateValidation"
import { loadFeedbackPreviewContext } from "./loadFeedbackPreviewContext"
import type {
  FeedbackPreviewContextClientDto,
  FeedbackTemplateEditorInitial,
  FeedbackTemplateValidation,
} from "../types"

export type FeedbackStep6Data =
  | { kind: "error"; message: string }
  | {
      kind: "ok"
      initialFeedbackTemplate: FeedbackTemplateEditorInitial | null
      validation: FeedbackTemplateValidation
      previewClient: FeedbackPreviewContextClientDto
      feedbackPreviewContextKey: string
    }

/**
 * Public Step 6 server loader used by the studies setup route.
 * Keeps feedback-specific preview/template orchestration inside the feedback feature.
 */
export const getFeedbackStep6DataRsc = cache(
  async (studyId: number): Promise<FeedbackStep6Data> => {
    const previewLoad = await loadFeedbackPreviewContext(studyId)
    if (previewLoad.kind === "error") {
      return { kind: "error", message: previewLoad.message }
    }

    const [initialFeedbackTemplate, validation] = await Promise.all([
      getFeedbackTemplateRsc(studyId),
      computeFeedbackTemplateValidation(studyId),
    ])

    return {
      kind: "ok",
      initialFeedbackTemplate,
      validation,
      previewClient: previewLoad.client,
      feedbackPreviewContextKey: previewLoad.contextKey,
    }
  }
)
