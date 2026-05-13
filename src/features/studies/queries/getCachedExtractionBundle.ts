import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { getCachedExtractionBundleRsc } from "../server/getCachedExtractionBundle"

const GetCachedExtractionBundle = z.object({
  studyId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export default resolver.pipe(
  resolver.zod(GetCachedExtractionBundle),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return getCachedExtractionBundleRsc(input)
  }
)
