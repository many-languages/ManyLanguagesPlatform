"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import type { DownloadPayload } from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import {
  CleanedResultsDownloadError,
  prepareCleanedResultsDownload,
} from "@/src/features/studies/server/prepareCleanedResultsDownload"

export async function downloadCleanedResultsAction(
  studyId: number
): Promise<{ success: true; payload: DownloadPayload } | { success: false; error: string }> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, error: "Not authenticated" }
    }

    const payload = await prepareCleanedResultsDownload({
      studyId,
      userId,
    })
    return { success: true, payload }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof CleanedResultsDownloadError
          ? error.message
          : mapJatosErrorToUserMessage(error),
    }
  }
}
