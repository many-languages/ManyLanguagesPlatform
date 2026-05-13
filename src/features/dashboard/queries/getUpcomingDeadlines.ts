import { resolver } from "@blitzjs/rpc"
import { getUpcomingDeadlines } from "../server/getUpcomingDeadlines"

export default resolver.pipe(resolver.authorize("RESEARCHER"), async () => {
  return getUpcomingDeadlines()
})
