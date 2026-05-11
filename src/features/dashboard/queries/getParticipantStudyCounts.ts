import { resolver } from "@blitzjs/rpc"
import { getParticipantStudyCounts } from "../server/getParticipantStudyCounts"

export default resolver.pipe(resolver.authorize("PARTICIPANT"), async () => {
  return getParticipantStudyCounts()
})
