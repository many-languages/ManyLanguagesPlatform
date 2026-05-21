// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { getPendingAdminApprovalStudiesForDashboardRsc } from "../server/getPendingAdminApprovalStudies"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPERADMIN"]), async () =>
  getPendingAdminApprovalStudiesForDashboardRsc()
)
