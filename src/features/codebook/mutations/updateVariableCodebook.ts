import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { updateVariableCodebookRsc } from "../server/updateVariableCodebook"

const UpdateVariableCodebook = z.object({
  studyId: z.number(),
  variables: z.array(
    z.object({
      variableKey: z.string(),
      variableName: z.string(),
      description: z.string().nullable(),
      personalData: z.boolean(),
    })
  ),
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateVariableCodebook),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return updateVariableCodebookRsc(input)
  }
)
