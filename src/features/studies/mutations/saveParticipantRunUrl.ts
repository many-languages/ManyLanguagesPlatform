import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { saveParticipantRunUrl } from "../server/studyParticipationWrites"

const SaveParticipantRunUrlSchema = z.object({
  participantStudyId: z.number(),
  jatosRunUrl: z.string(),
})

export default resolver.pipe(
  resolver.zod(SaveParticipantRunUrlSchema),
  resolver.authorize(),
  async ({ participantStudyId, jatosRunUrl }) => {
    return saveParticipantRunUrl({ participantStudyId, jatosRunUrl })
  }
)
