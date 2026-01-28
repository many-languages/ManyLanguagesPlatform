import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { GetStudyResearcher } from "../validations"
import { getBlitzContext } from "@/src/app/blitz-server"

// Core database function
const findStudyResearcher = cache(async (studyId: number, userId: number) => {
  return await db.studyResearcher.findUnique({
    where: { studyId_userId: { studyId, userId } },
    select: { id: true, role: true, createdAt: true },
  })
})

// Server-side helper for RSCs
export const getStudyResearcherRsc = async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  const researcher = await findStudyResearcher(studyId, session.userId)

  if (!researcher) throw new Error("You are not assigned to this study")

  return researcher
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyResearcher),
  resolver.authorize(),
  async ({ studyId }) => {
    return getStudyResearcherRsc(studyId)
  }
)
