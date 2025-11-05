import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { GetStudyParticipant } from "../validations"
import { getBlitzContext } from "@/src/app/blitz-server"

// Core database function
async function findStudyParticipant(studyId: number, userId: number) {
  return await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: {
      id: true,
      pseudonym: true,
      jatosRunUrl: true,
      createdAt: true,
      active: true,
      payed: true,
    },
  })
}

// Server-side helper for RSCs
export const getStudyParticipantRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudyParticipant(studyId, session.userId)
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyParticipant),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    return findStudyParticipant(studyId, ctx.session.userId!)
  }
)
