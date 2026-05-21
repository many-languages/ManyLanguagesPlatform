// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { getStudiesRsc } from "../server/getAdminStudies"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPERADMIN"]), async () => {
  return getStudiesRsc()
})
