import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { Prisma } from "db"

export const participantWithEmail = Prisma.validator<Prisma.ParticipantStudyDefaultArgs>()({
  include: { user: { select: { email: true } } },
})

export type ParticipantWithEmail = Prisma.ParticipantStudyGetPayload<typeof participantWithEmail>

const GetStudyParticipants = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetStudyParticipants),
  resolver.authorize(),
  async ({ studyId }): Promise<ParticipantWithEmail[]> => {
    const participants = await db.participantStudy.findMany({
      where: { studyId },
      orderBy: { createdAt: "asc" },
      ...participantWithEmail,
    })

    return participants
  }
)
