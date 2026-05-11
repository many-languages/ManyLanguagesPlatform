import { resolver } from "@blitzjs/rpc"
import { IsParticipantInStudy } from "@/src/features/studies/validations"
import { isParticipantInStudyRsc } from "../server/isParticipantInStudy"

export default resolver.pipe(
  resolver.zod(IsParticipantInStudy),
  resolver.authorize(),
  async ({ studyId }) => {
    return isParticipantInStudyRsc(studyId)
  }
)
