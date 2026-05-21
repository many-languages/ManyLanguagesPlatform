import { resolver } from "@blitzjs/rpc"
import { GetCodebookDataSchema } from "../validations"
import { getCodebookDataRsc } from "../server/getCodebookData"

export default resolver.pipe(
  resolver.zod(GetCodebookDataSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getCodebookDataRsc(studyId)
  }
)
