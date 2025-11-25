import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const GetStudyVariables = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export async function getStudyVariablesRsc(studyId: number) {
  await verifyResearcherStudyAccess(studyId)

  // Get all variables for this study, ordered by name
  const variables = await db.studyVariable.findMany({
    where: { studyId },
    orderBy: { name: "asc" },
  })

  return variables
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyVariables),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return getStudyVariablesRsc(input.studyId)
  }
)
