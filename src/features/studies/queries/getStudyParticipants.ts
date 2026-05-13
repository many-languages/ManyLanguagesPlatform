import { resolver } from "@blitzjs/rpc"
import { GetStudyParticipants } from "@/src/features/studies/validations"
import { getStudyParticipantsRsc } from "../server/getStudyParticipants"

export default resolver.pipe(
  resolver.zod(GetStudyParticipants),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getStudyParticipantsRsc(studyId)
  }
)
