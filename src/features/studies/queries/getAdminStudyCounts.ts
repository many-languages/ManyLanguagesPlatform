import { resolver } from "@blitzjs/rpc"
import { getAdminStudyCounts } from "../server/getAdminStudyCounts"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPERADMIN"]), async () =>
  getAdminStudyCounts()
)
