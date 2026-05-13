"use server"

import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { revokeAdminInvites as revokeAdminInvitesForIds } from "../server/revokeAdminInvites"

const RevokeAdminInvitesSchema = z.object({
  inviteIds: z.array(z.number()).min(1, "Select at least one invite"),
})

const revokeAdminInvites = resolver.pipe(
  resolver.zod(RevokeAdminInvitesSchema),
  resolver.authorize("SUPERADMIN"),
  async ({ inviteIds }) => revokeAdminInvitesForIds(inviteIds)
)

export default revokeAdminInvites
