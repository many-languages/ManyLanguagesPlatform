import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { GetStudyResearcher } from "../validations"
import { getBlitzContext } from "@/src/app/blitz-server"

// Core database function
async function findStudyResearcher(studyId: number, userId: number) {
  return await db.studyResearcher.findUnique({
    where: { studyId_userId: { studyId, userId } },
    select: { id: true, role: true, createdAt: true },
  })
}

// Server-side helper for RSCs
export const getStudyResearcherRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudyResearcher(studyId, session.userId)
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyResearcher),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    return findStudyResearcher(studyId, ctx.session.userId!)
  }
)
