import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getCodebookDataRsc } from "../server/getCodebookData"

const GetCodebookData = z.object({
  studyId: z.number(),
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetCodebookData),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getCodebookDataRsc(studyId)
  }
)
