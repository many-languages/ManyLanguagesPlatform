"use server"

import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { checkPilotCompletionFromMetadata } from "@/src/lib/jatos/api/checkPilotCompletion"
import type { GetResultsMetadataResponse } from "@/src/types/jatos-api"
import db from "db"

/**
 * Server Action to check pilot completion status.
 * Can be called from client components or server components.
 */
export async function checkPilotStatusAction(input: {
  jatosStudyUUID: string | null
  jatosStudyUploadId: number | null
}): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  const { jatosStudyUUID, jatosStudyUploadId } = input
  if (!jatosStudyUUID) {
    return { success: false, completed: null, error: "No JATOS study UUID" }
  }
  if (!jatosStudyUploadId) {
    return { success: false, completed: null, error: "No JATOS study upload" }
  }

  try {
    const pilotLinks = await db.pilotLink.findMany({
      where: { jatosStudyUploadId },
      select: { markerToken: true },
    })
    const markerTokens = new Set(pilotLinks.map((link) => link.markerToken))
    if (markerTokens.size === 0) {
      return { success: true, completed: false }
    }

    const metadata = (await getResultsMetadata({
      studyUuids: [jatosStudyUUID],
    })) as GetResultsMetadataResponse

    const completed = checkPilotCompletionFromMetadata(metadata, jatosStudyUUID, markerTokens)

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
