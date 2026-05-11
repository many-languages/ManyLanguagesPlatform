import { resolver } from "@blitzjs/rpc"
import { getParticipantCompletedNotPaidStudies } from "../server/getParticipantCompletedNotPaidStudies"

export default resolver.pipe(resolver.authorize("PARTICIPANT"), async () => {
  return getParticipantCompletedNotPaidStudies()
})
