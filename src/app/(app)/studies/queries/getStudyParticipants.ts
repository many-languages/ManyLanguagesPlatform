import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"

const GetStudyParticipants = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetStudyParticipants),
  resolver.authorize(),
  async ({ studyId }) => {
    const participants = await db.participantStudy.findMany({
      where: { studyId },
      orderBy: { createdAt: "asc" },
    })

    return participants
  }
)
