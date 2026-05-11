import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getParticipantPseudonymRsc } from "../server/getParticipantPseudonym"

const GetParticipantPseudonymSchema = z.object({
  studyId: z.number().int(),
})

export default resolver.pipe(
  resolver.zod(GetParticipantPseudonymSchema),
  resolver.authorize(),
  async ({ studyId }) => {
    return getParticipantPseudonymRsc(studyId)
  }
)
