import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"

const JoinStudy = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(JoinStudy),
  resolver.authorize(), // ensure user is logged in
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId
    if (!userId) throw new Error("You must be logged in to join a study")

    // Check if participant already joined
    const existing = await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } },
    })
    if (existing) return existing

    // Create new participant record
    const participant = await db.participantStudy.create({
      data: {
        userId,
        studyId,
      },
    })

    return participant
  }
)
