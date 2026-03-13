import {
  getAllPilotResultsForResearcher,
  type PilotResultsContext,
} from "@/src/lib/jatos/jatosAccessService"
import { getBlitzContext } from "@/src/app/blitz-server"
import { cache } from "react"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export type { PilotResultsContext }

// Server-side helper to get all pilot results for a study
export const getAllPilotResultsRsc = cache(
  async (studyId: number, context?: PilotResultsContext): Promise<EnrichedJatosStudyResult[]> => {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      throw new Error("Not authenticated")
    }
    return getAllPilotResultsForResearcher({ studyId, userId, context })
  }
)
