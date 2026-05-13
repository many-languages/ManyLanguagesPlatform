import { resolver } from "@blitzjs/rpc"
import { JoinStudy } from "@/src/features/studies/validations"
import { joinStudy } from "../server/studyParticipationWrites"

export default resolver.pipe(
  resolver.zod(JoinStudy),
  resolver.authorize(), // ensure user is logged in
  async ({ studyId }) => {
    return joinStudy(studyId)
  }
)
