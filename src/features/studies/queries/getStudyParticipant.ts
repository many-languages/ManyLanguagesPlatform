import { resolver } from "@blitzjs/rpc"
import { GetStudyParticipant } from "@/src/features/studies/validations"
import { getStudyParticipantRsc } from "../server/getStudyParticipant"

export default resolver.pipe(
  resolver.zod(GetStudyParticipant),
  resolver.authorize(),
  async ({ studyId }) => {
    return getStudyParticipantRsc(studyId)
  }
)
