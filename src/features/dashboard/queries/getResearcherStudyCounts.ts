import { resolver } from "@blitzjs/rpc"
import { getResearcherStudyCounts } from "../server/getResearcherStudyCounts"

export default resolver.pipe(resolver.authorize("RESEARCHER"), async () => {
  return getResearcherStudyCounts()
})
