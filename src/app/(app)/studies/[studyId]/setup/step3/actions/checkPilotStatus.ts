"use server"

import { checkPilotStatusForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { getBlitzContext } from "@/src/app/blitz-server"

/**
 * Server Action to check pilot completion status.
 * Can be called from client components or server components.
 */
export async function checkPilotStatusAction(input: {
  studyId: number
  jatosStudyUUID: string | null
  jatosStudyUploadId: number | null
}): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  const { studyId, jatosStudyUUID, jatosStudyUploadId } = input
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

    return await checkPilotStatusForResearcher({
      studyId,
      userId,
      jatosStudyUUID,
      jatosStudyUploadId,
    })
  } catch (error) {
    console.error("Failed to check pilot status:", error)
    return {
      success: false,
      completed: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
