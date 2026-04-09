"use server"

import { withStudyAccess } from "../../utils/withStudyAccess"
import { renderStaticFeedbackMarkdownForPersistedTemplate } from "../utils/renderFeedbackServer"
import { prepareFeedbackPreviewRenderInputs } from "../utils/prepareFeedbackPreviewRenderInputs"
import { getFeedbackPreviewContext } from "@/src/lib/feedback/previewContextStore"

/** Limits oversized template bodies (abuse / accidental paste). */
const MAX_TEMPLATE_CONTENT_LENGTH = 512_000

export type RenderFeedbackPreviewResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string }

/**
 * Step 6 live preview: resolves `contextKey` to server-stored pilot + codebook snapshot.
 * Uses approved extraction id from context (not persisted feedback template metadata).
 * Caller must be an authenticated researcher with access to the study.
 */
export async function renderFeedbackPreviewAction(input: {
  studyId: number
  contextKey: string
  templateContent: string
  withinStudyResultId?: number
}): Promise<RenderFeedbackPreviewResult> {
  if (input.templateContent.length > MAX_TEMPLATE_CONTENT_LENGTH) {
    return { ok: false, error: "Template is too large to preview." }
  }

  return await withStudyAccess(input.studyId, async (studyId, userId) => {
    const ctx = getFeedbackPreviewContext(input.contextKey)
    if (!ctx || ctx.studyId !== studyId || ctx.userId !== userId) {
      const keyLen = input.contextKey.length
      const keyPreview = keyLen > 0 ? `${input.contextKey.slice(0, 8)}…(len=${keyLen})` : "(empty)"
      if (!ctx) {
        console.error("[renderFeedbackPreviewAction] preview context missing", {
          contextKeyPreview: keyPreview,
          studyId,
          userId,
        })
      } else if (ctx.studyId !== studyId) {
        console.error("[renderFeedbackPreviewAction] preview context studyId mismatch", {
          contextKeyPreview: keyPreview,
          sessionStudyId: studyId,
          ctxStudyId: ctx.studyId,
          userId,
        })
      } else {
        console.error("[renderFeedbackPreviewAction] preview context userId mismatch", {
          contextKeyPreview: keyPreview,
          studyId,
          sessionUserId: userId,
          ctxUserId: ctx.userId,
        })
      }
      return { ok: false, error: "Preview session expired. Refresh the page." }
    }

    const prepared = await prepareFeedbackPreviewRenderInputs(ctx, {
      templateContent: input.templateContent,
      withinStudyResultId: input.withinStudyResultId,
    })

    if (prepared.kind === "error") {
      return { ok: false, error: prepared.error }
    }
    if (prepared.kind === "passthrough") {
      return { ok: true, markdown: prepared.markdown }
    }

    const markdown = renderStaticFeedbackMarkdownForPersistedTemplate({
      templateContent: prepared.templateContent,
      requiredVariableNames: prepared.effectiveVariableNames,
      requiredVariableNamesExplicit: true,
      variableKeysAllowlist: prepared.variableKeysAllowlist,
      enrichedResult: prepared.primary,
      cohortEnrichedResults: prepared.cohortEnrichedResults,
    })

    return { ok: true, markdown }
  })
}
