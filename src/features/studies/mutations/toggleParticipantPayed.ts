import { resolver } from "@blitzjs/rpc"
import { ToggleParticipantPayed } from "@/src/features/studies/validations"
import { toggleParticipantPayed } from "../server/studyParticipationWrites"

export default resolver.pipe(
  resolver.zod(ToggleParticipantPayed),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makePayed }) => {
    return toggleParticipantPayed({ participantIds, makePayed })
  }
)
