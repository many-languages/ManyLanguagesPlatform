"use server"

import { checkPilotStatusForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { getBlitzContext } from "@/src/app/blitz-server"
import { isJatosMappedError, mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import { applySetupCompletionFlags } from "../server/studySetupWrites"
import { CheckPilotStatusActionSchema } from "../validations"

/**
 * Server Action to check pilot completion status.
 * Can be called from client components or server components.
 */
export async function checkPilotStatusAction(
  input: unknown
): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  const parsed = CheckPilotStatusActionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, completed: null, error: "Invalid pilot status input" }
  }

  const { studyId, jatosStudyUUID, jatosStudyUploadId } = parsed.data
  if (!jatosStudyUUID) {
    return { success: false, completed: null, error: "No JATOS study UUID" }
  }
  if (!jatosStudyUploadId) {
    return { success: false, completed: null, error: "No JATOS study upload" }
  }

  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, completed: null, error: "Not authenticated" }
    }

    const result = await checkPilotStatusForResearcher({
      studyId,
      userId,
      jatosStudyUUID,
      jatosStudyUploadId,
    })

    if (result.success && result.completed) {
      await applySetupCompletionFlags({ studyId, step3Completed: true })
    }

    return result
  } catch (error) {
    if (!isJatosMappedError(error)) {
      console.error("[checkPilotStatusAction]", { studyId, error })
    }
    return {
      success: false,
      completed: null,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
