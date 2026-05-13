"use server"

import { resolver } from "@blitzjs/rpc"
import { getStalePendingAdminInvitesRsc } from "../server/getStalePendingAdminInvites"

export default resolver.pipe(resolver.authorize("SUPERADMIN"), async () =>
  getStalePendingAdminInvitesRsc()
)
