import { resolver } from "@blitzjs/rpc"
import { ToggleParticipantActive } from "@/src/features/studies/validations"
import { toggleParticipantActive } from "../server/studyParticipationWrites"

export default resolver.pipe(
  resolver.zod(ToggleParticipantActive),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makeActive }) => {
    return toggleParticipantActive({ participantIds, makeActive })
  }
)
