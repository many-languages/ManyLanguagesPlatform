import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { cache } from "react"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const GetStudyVariables = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getStudyVariablesRsc = cache(async (studyId: number) => {
  await verifyResearcherStudyAccess(studyId)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { approvedExtractionId: true },
  })

  if (!study?.approvedExtractionId) {
    return []
  }

  // Get variables for the approved extraction snapshot
  const variables = await db.studyVariable.findMany({
    where: { extractionSnapshotId: study.approvedExtractionId },
    orderBy: { variableName: "asc" },
  })

  return variables
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyVariables),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return getStudyVariablesRsc(input.studyId)
  }
)
