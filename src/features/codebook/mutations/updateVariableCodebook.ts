import { resolver } from "@blitzjs/rpc"
import { UpdateVariableCodebookSchema } from "../validations"
import { updateVariableCodebookRsc } from "../server/updateVariableCodebook"

export default resolver.pipe(
  resolver.zod(UpdateVariableCodebookSchema),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return updateVariableCodebookRsc(input)
  }
)
