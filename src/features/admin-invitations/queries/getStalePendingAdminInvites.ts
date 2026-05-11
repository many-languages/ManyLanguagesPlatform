"use server"

import { resolver } from "@blitzjs/rpc"
import {
  STALE_ADMIN_INVITE_MIN_AGE_MS,
  getStalePendingAdminInvitesRsc,
} from "../server/getStalePendingAdminInvites"

export default resolver.pipe(resolver.authorize("SUPERADMIN"), async () =>
  getStalePendingAdminInvitesRsc(STALE_ADMIN_INVITE_MIN_AGE_MS)
)
