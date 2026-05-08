import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getSetupCompletionRsc } from "../services/setup"

const GetSetupCompletion = z.object({
  studyId: z.number(),
})

// Blitz RPC for client usage with useQuery
export default resolver.pipe(
  resolver.zod(GetSetupCompletion),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getSetupCompletionRsc(studyId) // Reuse the shared studies service function
  }
)
