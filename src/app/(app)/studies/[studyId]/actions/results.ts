"use server"

import { revalidatePath } from "next/cache"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getEnrichedResultsForResearcher,
  downloadAllResultsForResearcher,
  type DownloadPayload,
} from "@/src/lib/jatos/jatosAccessService"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

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
  } catch (error: any) {
    console.error("Error downloading results:", error)
    return {
      success: false,
      error: error.message || "Failed to download results",
    }
  }
}

export async function refetchEnrichedResultsAction(
  jatosStudyId: number,
  _metadata: unknown,
  studyId: number
): Promise<
  { success: true; data: EnrichedJatosStudyResult[] } | { success: false; error: string }
> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, error: "Not authenticated" }
    }

    const enriched = await getEnrichedResultsForResearcher({ studyId, userId, jatosStudyId })

    revalidatePath(`/studies/${studyId}`)

    return { success: true, data: enriched }
  } catch (error: any) {
    console.error("Error refetching enriched results:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch and process results",
    }
  }
}
