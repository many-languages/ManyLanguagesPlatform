import { getPilotResultByIdForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { getBlitzContext } from "@/src/app/blitz-server"
import { cache } from "react"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

// Server-side helper to fetch a specific pilot result by ID.
export const getPilotResultByIdRsc = cache(
  async (
    studyId: number,
    testResultId: number,
    jatosStudyIdContext?: number
  ): Promise<EnrichedJatosStudyResult> => {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      throw new Error("Not authenticated")
    }
    return getPilotResultByIdForResearcher({
      studyId,
      userId,
      testResultId,
      jatosStudyIdContext,
    })
  }
)
