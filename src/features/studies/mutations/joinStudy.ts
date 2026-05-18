import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import { UserRole } from "@/db"
import { JoinStudy } from "@/src/features/studies/validations"
import { joinStudy } from "../server/studyParticipationWrites"

export default resolver.pipe(
  resolver.zod(JoinStudy),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    if (ctx.session.role !== UserRole.PARTICIPANT) {
      throw new AuthorizationError("Only participants can join studies")
    }
    return joinStudy(studyId)
  }
)
