import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetParticipantPseudonymSchema = z.object({
  studyId: z.number().int(),
})

export default resolver.pipe(
  resolver.zod(GetParticipantPseudonymSchema),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId!
    const ps = await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } }, // uses @@unique([userId, studyId])
      select: { pseudonym: true },
    })
    if (!ps) throw new Error("Participant not found for this study")
    return ps
  }
)
