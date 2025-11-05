import db from "db"
import { resolver } from "@blitzjs/rpc"
import { cache } from "react"
import { IsParticipantInStudy } from "../validations"
import { getBlitzContext } from "@/src/app/blitz-server"

// Core database function
async function checkParticipantInStudy(studyId: number, userId: number) {
  const participant = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { id: true },
  })

  return { joined: !!participant }
}

// Server-side helper for RSCs
export const isParticipantInStudyRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return checkParticipantInStudy(studyId, session.userId)
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(IsParticipantInStudy),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")
    return checkParticipantInStudy(studyId, ctx.session.userId)
  }
)
