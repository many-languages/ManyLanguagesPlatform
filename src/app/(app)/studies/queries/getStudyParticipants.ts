import db from "db"
import { resolver } from "@blitzjs/rpc"
import { Prisma } from "db"
import { cache } from "react"
import { GetStudyParticipants } from "../validations"
import { getBlitzContext } from "@/src/app/blitz-server"

export const participantWithEmail = Prisma.validator<Prisma.ParticipantStudyDefaultArgs>()({
  include: { user: { select: { email: true } } },
})

export type ParticipantWithEmail = Prisma.ParticipantStudyGetPayload<typeof participantWithEmail>

// Core database function
async function findStudyParticipants(studyId: number): Promise<ParticipantWithEmail[]> {
  const participants = await db.participantStudy.findMany({
    where: { studyId },
    orderBy: { createdAt: "asc" },
    ...participantWithEmail,
  })

  return participants
}

// Server-side helper for RSCs
export const getStudyParticipantsRsc = cache(async (studyId: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  return findStudyParticipants(studyId)
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetStudyParticipants),
  resolver.authorize(),
  async ({ studyId }) => {
    return findStudyParticipants(studyId)
  }
)
