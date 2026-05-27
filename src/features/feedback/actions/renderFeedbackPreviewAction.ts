"use server"

import { withStudyAccess } from "@/src/features/studies/services"
import { renderStaticFeedbackMarkdownForPersistedTemplate } from "@/src/features/feedback/server/renderFeedbackServer"
import { prepareFeedbackPreviewRenderInputs } from "@/src/features/feedback/server/prepareFeedbackPreviewRenderInputs"
import { getFeedbackPreviewContext } from "@/src/features/feedback/domain/previewContextStore"
import { RenderFeedbackPreviewActionSchema } from "../validations"

export type RenderFeedbackPreviewResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string }

/**
 * Step 6 live preview: resolves `contextKey` to server-stored pilot + codebook snapshot.
 * Uses approved extraction id from context (not persisted feedback template metadata).
 * Caller must be an authenticated researcher with access to the study.
 */
export async function renderFeedbackPreviewAction(
  input: unknown
): Promise<RenderFeedbackPreviewResult> {
  const parsed = RenderFeedbackPreviewActionSchema.safeParse(input)
  if (!parsed.success) {
    const error = parsed.error.errors[0]?.message ?? "Invalid preview input."
    return { ok: false, error }
  }

  const { studyId, contextKey, templateContent, withinStudyResultId } = parsed.data

  return await withStudyAccess(studyId, async (verifiedStudyId, userId) => {
    const ctx = await getFeedbackPreviewContext(contextKey)
    if (!ctx || ctx.studyId !== verifiedStudyId || ctx.userId !== userId) {
      const keyLen = contextKey.length
      const keyPreview = keyLen > 0 ? `${contextKey.slice(0, 8)}…(len=${keyLen})` : "(empty)"
      if (!ctx) {
        console.error("[renderFeedbackPreviewAction] preview context missing", {
          contextKeyPreview: keyPreview,
          studyId: verifiedStudyId,
          userId,
        })
      } else if (ctx.studyId !== verifiedStudyId) {
        console.error("[renderFeedbackPreviewAction] preview context studyId mismatch", {
          contextKeyPreview: keyPreview,
          sessionStudyId: verifiedStudyId,
          ctxStudyId: ctx.studyId,
          userId,
        })
      } else {
        console.error("[renderFeedbackPreviewAction] preview context userId mismatch", {
          contextKeyPreview: keyPreview,
          studyId: verifiedStudyId,
          sessionUserId: userId,
          ctxUserId: ctx.userId,
        })
      }
      return { ok: false, error: "Preview session expired. Refresh the page." }
    }

    const prepared = await prepareFeedbackPreviewRenderInputs(ctx, {
      templateContent,
      withinStudyResultId,
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
