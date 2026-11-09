import { resolver } from "@blitzjs/rpc"
import { AllowParticipantRetry } from "@/src/features/studies/validations"
import { allowParticipantRetry } from "../server/participantRetryWrites"

export default resolver.pipe(
  resolver.zod(AllowParticipantRetry),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds }) => {
    return allowParticipantRetry({ participantIds })
  }
)
