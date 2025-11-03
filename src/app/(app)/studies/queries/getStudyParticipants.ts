import db from "db"
import { resolver } from "@blitzjs/rpc"
import { Prisma } from "db"
import { GetStudyParticipants } from "../validations"

export const participantWithEmail = Prisma.validator<Prisma.ParticipantStudyDefaultArgs>()({
  include: { user: { select: { email: true } } },
})

export type ParticipantWithEmail = Prisma.ParticipantStudyGetPayload<typeof participantWithEmail>

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
