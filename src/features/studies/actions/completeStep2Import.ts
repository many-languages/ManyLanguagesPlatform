"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { getBatchIdForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { updateStudyBatch, updateSetupCompletion } from "../server/studySetupWrites"
import { createResearcherPilotUrlAndSaveAction } from "./createResearcherPilotUrl"
import { CompleteStep2ImportSchema } from "../validations"
import db from "db"

export type CompleteStep2ImportResult = { ok: true } | { ok: false; error: string }

/**
 * Server-side orchestration for the final phase of the Step 2 JATOS import:
 *
 *  1. Fetch the JATOS batch ID for the study.
 *  2. Persist the batch ID on the latest upload.
 *  3. Mark step 2 as complete on the latest upload.
 *  4. Auto-generate a personal pilot link for the current researcher (best-effort;
 *     failure is logged but does not fail the whole import).
 *
 * The upload itself (file transfer + DB + membership sync) is done by the caller
 * before this action is invoked.
 */
export async function completeStep2ImportAction(
  input: unknown
): Promise<CompleteStep2ImportResult> {
  const parsed = CompleteStep2ImportSchema.safeParse(input)
  if (!parsed.success) {
    const error = parsed.error.errors[0]?.message ?? "Invalid import completion input."
    return { ok: false, error }
  }

  const { studyId, jatosStudyId, jatosStudyUUID, latestUploadId } = parsed.data

  const { session } = await getBlitzContext()
  const userId = session.userId
  if (userId == null) {
    return { ok: false, error: "Not authenticated" }
  }

  // 1. Get batch ID from JATOS
  const jatosBatchId = await getBatchIdForResearcher({
    studyId,
    userId,
    jatosStudyUUID,
  })
  if (!jatosBatchId) {
    return { ok: false, error: "No JATOS batch found for this study" }
  }

  // 2. Persist batch ID
  await updateStudyBatch({ studyId, jatosBatchId })

  // 3. Mark step 2 as complete
  try {
    await updateSetupCompletion({ studyId, step2Completed: true })
  } catch (err) {
    console.error("[completeStep2Import] Failed to mark step 2 complete:", err)
    // Non-fatal — the batch ID is saved; step flag can be retried
  }

  // 4. Auto-generate pilot link for the current researcher (best-effort)
  if (latestUploadId != null) {
    try {
      const researcher = await db.studyResearcher.findFirst({
        where: { studyId, userId },
        select: { id: true },
      })
      if (researcher) {
        await createResearcherPilotUrlAndSaveAction({
          studyId,
          studyResearcherId: researcher.id,
          jatosStudyUploadId: latestUploadId,
          jatosStudyId,
          jatosBatchId,
        })
      }
    } catch (err) {
      console.error("[completeStep2Import] Failed to auto-generate pilot link:", err)
      // Non-fatal — researcher can generate it manually in Step 3
    }
  }

  return { ok: true }
}
