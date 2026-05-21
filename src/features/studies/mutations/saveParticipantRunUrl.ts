import { resolver } from "@blitzjs/rpc"
import { SaveParticipantRunUrlSchema } from "@/src/features/studies/validations"
import { saveParticipantRunUrl } from "../server/studyParticipationWrites"

export default resolver.pipe(
  resolver.zod(SaveParticipantRunUrlSchema),
  resolver.authorize(),
  async ({ participantStudyId, jatosRunUrl }) => {
    return saveParticipantRunUrl({ participantStudyId, jatosRunUrl })
  }
)
