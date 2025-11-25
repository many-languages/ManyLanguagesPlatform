import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetStudyVariables = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export async function getStudyVariablesRsc(studyId: number) {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  // Verify the user is a researcher on this study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId: session.userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to view variables for this study.")
  }

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
