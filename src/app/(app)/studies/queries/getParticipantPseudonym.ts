import { resolver } from "@blitzjs/rpc"
import db from "db"
import { cache } from "react"
import { z } from "zod"
import { getBlitzContext } from "@/src/app/blitz-server"

const GetParticipantPseudonymSchema = z.object({
  studyId: z.number().int(),
})

// Core database function
async function findParticipantPseudonym(studyId: number, userId: number) {
  const ps = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } }, // uses @@unique([userId, studyId])
    select: { pseudonym: true },
  })
  if (!ps) throw new Error("Participant not found for this study")
  return ps
}

// Server-side helper for RSCs
export const getParticipantPseudonymRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findParticipantPseudonym(studyId, session.userId)
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetParticipantPseudonymSchema),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    return findParticipantPseudonym(studyId, ctx.session.userId!)
  }
)
