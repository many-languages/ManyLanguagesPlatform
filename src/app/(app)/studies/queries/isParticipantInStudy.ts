import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"

const IsParticipantInStudy = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(IsParticipantInStudy),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId
    if (!userId) throw new Error("Not authenticated")

    const participant = await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } },
      select: { id: true },
    })

    return { joined: !!participant }
  }
)
