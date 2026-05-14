"use server"

import { revalidatePath } from "next/cache"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getEnrichedResultsForResearcher,
  downloadAllResultsForResearcher,
  type DownloadPayload,
} from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import type { ResearcherRawResultInspectorPayload } from "../types"

export async function downloadResultsAction(
  studyId: number
): Promise<{ success: true; payload: DownloadPayload } | { success: false; error: string }> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, error: "Not authenticated" }
    }

    const payload = await downloadAllResultsForResearcher({ studyId, userId })
    return { success: true, payload }
  } catch (error) {
    return {
      success: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}

export async function refetchEnrichedResultsAction(input: {
  jatosStudyId: number
  studyId: number
}): Promise<
  { success: true; data: ResearcherRawResultInspectorPayload } | { success: false; error: string }
> {
  try {
    const { jatosStudyId, studyId } = input
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, error: "Not authenticated" }
    }

    const enriched = await getEnrichedResultsForResearcher({ studyId, userId, jatosStudyId })

    revalidatePath(`/studies/${studyId}`)

    return { success: true, data: { enrichedResults: enriched } }
  } catch (error) {
    return {
      success: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
