import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { cache } from "react"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const GetSetupCompletion = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getSetupCompletionRsc = cache(async (studyId: number) => {
  await verifyResearcherStudyAccess(studyId)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      step4Completed: true,
      step5Completed: true,
      step6Completed: true,
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  return study
})

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(GetSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getSetupCompletionRsc(studyId) // Reuse the cached RSC function
  }
)
