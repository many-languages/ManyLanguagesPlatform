import { resolver } from "@blitzjs/rpc"
import { getParticipantIncompleteStudies } from "../server/getParticipantIncompleteStudies"

export default resolver.pipe(resolver.authorize("PARTICIPANT"), async () => {
  return getParticipantIncompleteStudies()
})
