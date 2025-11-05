"use server"

import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { checkPilotCompletionFromMetadata } from "@/src/lib/jatos/api/checkPilotCompletion"
import type { GetResultsMetadataResponse } from "@/src/types/jatos-api"

/**
 * Server Action to check pilot completion status.
 * Can be called from client components or server components.
 */
export async function checkPilotStatusAction(
  jatosStudyUUID: string | null
): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  if (!jatosStudyUUID) {
    return { success: false, completed: null, error: "No JATOS study UUID" }
  }

  try {
    const metadata = (await getResultsMetadata({
      studyUuids: [jatosStudyUUID],
    })) as GetResultsMetadataResponse

    const completed = checkPilotCompletionFromMetadata(metadata, jatosStudyUUID)

    return { success: true, completed }
  } catch (error) {
    console.error("Failed to check pilot status:", error)
    return {
      success: false,
      completed: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
