import { resolver } from "@blitzjs/rpc"
import { getActiveStudiesWithResponseCounts } from "../server/getActiveStudiesWithResponseCounts"

export default resolver.pipe(resolver.authorize("RESEARCHER"), async () => {
  return getActiveStudiesWithResponseCounts()
})
