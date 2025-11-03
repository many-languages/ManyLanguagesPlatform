import { resolver } from "@blitzjs/rpc"
import db from "db"
import { GetStudyParticipant } from "../validations"

export default resolver.pipe(
  resolver.zod(GetStudyParticipant),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId!
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
)
