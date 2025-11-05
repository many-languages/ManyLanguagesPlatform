"use server"

import { revalidatePath } from "next/cache"
import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import type { JatosMetadata, EnrichedJatosStudyResult } from "@/src/types/jatos"

export async function refetchEnrichedResultsAction(
  jatosStudyId: number,
  metadata: JatosMetadata,
  studyId: number
): Promise<
  { success: true; data: EnrichedJatosStudyResult[] } | { success: false; error: string }
> {
  try {
    // Fetch ZIP from JATOS (server-side)
    const result = await getResultsData({ studyIds: String(jatosStudyId) })

    if (!result.success) {
      return { success: false, error: "Failed to fetch results from JATOS" }
    }

    // Parse ZIP (server-side)
    const files = await parseJatosZip(result.data)

    // Match and enrich data (server-side)
    const enriched = matchJatosDataToMetadata(metadata, files)

    // Invalidate cache to ensure fresh data on next render
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
